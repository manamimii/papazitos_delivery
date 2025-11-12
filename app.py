from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
from database.db import get_connection, criar_tabelas
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = 'papazitos_chave_fixa_123'

CORS(app, supports_credentials=True)

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False   
app.config['SESSION_COOKIE_HTTPONLY'] = True

criar_tabelas()


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario_id' not in session:
            flash('⚠️ Faça login primeiro!')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/', methods=['GET', 'POST'])
@login_required
def home():
    return render_template('home.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        nome = data.get('nome')
        email = data.get('email')
        senha = data.get('senha')
        perfil = data.get('perfil')

        conn = get_connection()
        conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM usuarios WHERE email = ?", (email,))
        usuario = cursor.fetchone()

        if usuario:
            if check_password_hash(usuario['senha_hash'], senha):
                session['usuario_id'] = usuario['id']
                session['perfil'] = usuario['perfil']
                session['nome'] = usuario['nome']
                conn.close()    
                return jsonify(success=True), 200
            else:
                return jsonify(success=False, message="Senha incorreta"), 401
        else:
            if not nome or not senha or not perfil:
                return jsonify(success=False, message="Preencha todos os campos"), 400
            else:
                senha_hash = generate_password_hash(senha)
                cursor.execute("""
                    INSERT INTO usuarios (nome, email, senha_hash, perfil)
                    VALUES (?, ?, ?, ?)
                """, (nome, email, senha_hash, perfil))
                conn.commit()
                novo_id = cursor.lastrowid
                conn.close()

                session['usuario_id'] = novo_id
                session['perfil'] = perfil
                session['nome'] = nome
                return jsonify(success=True), 200
        conn.close()
    return render_template('login.html')


@app.route('/api/cep/<cep>')
@login_required
def buscar_cep(cep):
    """Integração com API ViaCEP"""
    try:
        cep_limpo = cep.replace('-', '').replace('.', '')
        response = requests.get(f'https://viacep.com.br/ws/{cep_limpo}/json/', timeout=5)
        
        if response.status_code == 200:
            dados = response.json()
            if 'erro' not in dados:
                return jsonify({
                    'success': True,
                    'cep': dados.get('cep'),
                    'logradouro': dados.get('logradouro'),
                    'bairro': dados.get('bairro'),
                    'cidade': dados.get('localidade'),
                    'estado': dados.get('uf'),
                    'complemento': dados.get('complemento')
                })
        
        return jsonify({'success': False, 'message': 'CEP não encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calcular-frete', methods=['POST'])
@login_required
def calcular_frete():
    """
    Calcula o frete baseado na distância
    Para usar Mapbox ou Google Geocoding, você precisa de uma API Key
    Por enquanto, vou simular o cálculo baseado no CEP
    """
    data = request.get_json()
    cep_origem = data.get('cep_origem', '79000000')  
    cep_destino = data.get('cep_destino')
    
    try:
       
        distancia_km = abs(int(cep_origem[:5]) - int(cep_destino[:5])) / 100
        
        
        frete = 5.00 + (distancia_km * 2.00)
        
        return jsonify({
            'success': True,
            'distancia_km': round(distancia_km, 2),
            'valor_frete': round(frete, 2)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/produtos', methods=['GET'])
def listar_produtos():
    """Lista todos os produtos disponíveis"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, u.nome as restaurante_nome
        FROM produtos p
        JOIN usuarios u ON p.restaurante_id = u.id
        WHERE p.disponivel = 1
    """)
    
    produtos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(produtos)

@app.route('/api/produtos/restaurante/<int:restaurante_id>', methods=['GET'])
def produtos_restaurante(restaurante_id):
    """Lista produtos de um restaurante específico"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM produtos 
        WHERE restaurante_id = ?
    """, (restaurante_id,))
    
    produtos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(produtos)

@app.route('/api/produtos', methods=['POST'])
@login_required
def criar_produto():
    """Cria um novo produto (apenas restaurantes)"""
    if session.get('perfil') != 'restaurante':
        return jsonify({'success': False, 'message': 'Apenas restaurantes podem criar produtos'}), 403
    
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO produtos (restaurante_id, nome, descricao, preco, disponivel)
        VALUES (?, ?, ?, ?, ?)
    """, (
        session['usuario_id'],
        data['nome'],
        data.get('descricao', ''),
        data['preco'],
        data.get('disponivel', 1)
    ))
    
    conn.commit()
    produto_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'success': True, 'id': produto_id})

@app.route('/api/produtos/<int:id>', methods=['PUT'])
@login_required
def atualizar_produto(id):
    """Atualiza um produto"""
    if session.get('perfil') != 'restaurante':
        return jsonify({'success': False, 'message': 'Sem permissão'}), 403
    
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE produtos 
        SET nome=?, descricao=?, preco=?, disponivel=?
        WHERE id=? AND restaurante_id=?
    """, (
        data['nome'],
        data.get('descricao', ''),
        data['preco'],
        data.get('disponivel', 1),
        id,
        session['usuario_id']
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
@login_required
def deletar_produto(id):
    """Deleta um produto"""
    if session.get('perfil') != 'restaurante':
        return jsonify({'success': False, 'message': 'Sem permissão'}), 403
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM produtos 
        WHERE id=? AND restaurante_id=?
    """, (id, session['usuario_id']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})


@app.route('/api/pedidos', methods=['POST'])
@login_required
def criar_pedido():
    """Cria um novo pedido com endereço e frete"""
    data = request.get_json()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Criar pedido
    cursor.execute("""
        INSERT INTO pedidos (
            cliente_id, restaurante_id, status, 
            cep, logradouro, numero, complemento, bairro, cidade, estado,
            valor_produtos, valor_frete, valor_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session['usuario_id'],
        data['restaurante_id'],
        'recebido',
        data['endereco']['cep'],
        data['endereco']['logradouro'],
        data['endereco']['numero'],
        data['endereco'].get('complemento', ''),
        data['endereco']['bairro'],
        data['endereco']['cidade'],
        data['endereco']['estado'],
        data['valor_produtos'],
        data['valor_frete'],
        data['valor_total']
    ))
    
    pedido_id = cursor.lastrowid
    
    for item in data['itens']:
        cursor.execute("""
            INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
            VALUES (?, ?, ?, ?)
        """, (pedido_id, item['produto_id'], item['quantidade'], item['preco']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'pedido_id': pedido_id})

@app.route('/api/pedidos/meus', methods=['GET'])
@login_required
def meus_pedidos():
    """Lista pedidos do cliente logado"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, u.nome as restaurante_nome
        FROM pedidos p
        JOIN usuarios u ON p.restaurante_id = u.id
        WHERE p.cliente_id = ?
        ORDER BY p.data_hora DESC
    """, (session['usuario_id'],))
    
    pedidos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(pedidos)

@app.route('/api/pedidos/restaurante', methods=['GET'])
@login_required
def pedidos_restaurante():
    """Lista pedidos recebidos pelo restaurante"""
    if session.get('perfil') != 'restaurante':
        return jsonify({'success': False, 'message': 'Sem permissão'}), 403
    
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    status = request.args.get('status')
    
    if status:
        cursor.execute("""
            SELECT p.*, u.nome as cliente_nome
            FROM pedidos p
            JOIN usuarios u ON p.cliente_id = u.id
            WHERE p.restaurante_id = ? AND p.status = ?
            ORDER BY p.data_hora DESC
        """, (session['usuario_id'], status))
    else:
        cursor.execute("""
            SELECT p.*, u.nome as cliente_nome
            FROM pedidos p
            JOIN usuarios u ON p.cliente_id = u.id
            WHERE p.restaurante_id = ?
            ORDER BY p.data_hora DESC
        """, (session['usuario_id'],))
    
    pedidos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(pedidos)

@app.route('/api/pedidos/<int:pedido_id>', methods=['GET'])
@login_required
def detalhe_pedido(pedido_id):
    """Detalhes de um pedido específico"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    
    cursor.execute("""
        SELECT p.*, 
               u_cliente.nome as cliente_nome,
               u_rest.nome as restaurante_nome
        FROM pedidos p
        JOIN usuarios u_cliente ON p.cliente_id = u_cliente.id
        JOIN usuarios u_rest ON p.restaurante_id = u_rest.id
        WHERE p.id = ?
    """, (pedido_id,))
    
    pedido = dict(cursor.fetchone())
    
    
    cursor.execute("""
        SELECT ip.*, pr.nome as produto_nome
        FROM itens_pedido ip
        JOIN produtos pr ON ip.produto_id = pr.id
        WHERE ip.pedido_id = ?
    """, (pedido_id,))
    
    pedido['itens'] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return jsonify(pedido)

@app.route('/api/pedidos/<int:pedido_id>/status', methods=['PUT'])
@login_required
def atualizar_status_pedido(pedido_id):
    """Atualiza status do pedido (apenas restaurante)"""
    if session.get('perfil') != 'restaurante':
        return jsonify({'success': False, 'message': 'Sem permissão'}), 403
    
    data = request.get_json()
    novo_status = data.get('status')
    
    
    status_validos = ['recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado']
    if novo_status not in status_validos:
        return jsonify({'success': False, 'message': 'Status inválido'}), 400
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE pedidos 
        SET status = ?
        WHERE id = ? AND restaurante_id = ?
    """, (novo_status, pedido_id, session['usuario_id']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'status': novo_status})


@app.route('/menu')
@login_required
def menu():
    return render_template('menu.html')

@app.route('/cardapio')
@login_required
def cardapio():
    return render_template('cardapio-cliente.html')

@app.route('/gerenciar-cardapio')
@login_required
def gerenciar_cardapio():
    if session.get('perfil') != 'restaurante':
        flash('Acesso negado')
        return redirect(url_for('home'))
    return render_template('gerenciar-cardapio.html')

@app.route('/pedido')
@login_required
def pedido():
    return render_template('pedido.html')

@app.route('/finalizar-pedido')
@login_required
def finalizar_pedido():
    return render_template('finalizar-pedido.html')

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash('👋 Sessão encerrada!')
    return redirect(url_for('login'))



@app.route('/pedidos')
@login_required
def pedidos_page():
    return render_template('pedidos.html')



@app.route('/pedidos/recebidos', methods=['GET'])
@login_required
def pedido_atual_cliente():
    """Retorna o pedido mais recente do cliente logado"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, u.nome as restaurante_nome
        FROM pedidos p
        JOIN usuarios u ON p.restaurante_id = u.id
        WHERE p.cliente_id = ?
        ORDER BY p.data_hora DESC
        LIMIT 1
    """, (session['usuario_id'],))

    pedido = cursor.fetchone()

    if not pedido:
        conn.close()
        return jsonify({}), 200

    pedido_dict = dict(pedido)

    cursor.execute("""
        SELECT ip.*, pr.nome, pr.preco
        FROM itens_pedido ip
        JOIN produtos pr ON ip.produto_id = pr.id
        WHERE ip.pedido_id = ?
    """, (pedido['id'],))
    itens = [dict(row) for row in cursor.fetchall()]

    pedido_dict['itens'] = itens

    conn.close()
    return jsonify(pedido_dict)



if __name__ == '__main__':
    app.run(debug=True)