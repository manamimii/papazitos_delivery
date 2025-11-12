import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'delivery.db')

def get_connection():
    db_absoluto = os.path.abspath(DB_PATH)
    print(f" Usando banco de dados em: {db_absoluto}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def criar_tabelas():
    conn = get_connection()
    cursor = conn.cursor()

    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK(perfil IN ('restaurante', 'cliente')),
        telefone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

   
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurante_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        disponivel INTEGER DEFAULT 1,
        imagem_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurante_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
    ''')

   
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        restaurante_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'recebido',
        
        -- Endereço de entrega
        cep TEXT NOT NULL,
        logradouro TEXT NOT NULL,
        numero TEXT NOT NULL,
        complemento TEXT,
        bairro TEXT NOT NULL,
        cidade TEXT NOT NULL,
        estado TEXT NOT NULL,
        
        -- Valores
        valor_produtos REAL NOT NULL,
        valor_frete REAL NOT NULL,
        valor_total REAL NOT NULL,
        
        data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CHECK(status IN ('recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado'))
    )
    ''')

  
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        preco_unitario REAL NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )
    ''')

    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        nota INTEGER NOT NULL CHECK(nota >= 1 AND nota <= 5),
        comentario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()
    
   
    criar_dados_exemplo(conn)
    
    conn.close()
    print("✅ Tabelas criadas com sucesso!")

def criar_dados_exemplo(conn):
    """Cria dados de exemplo se o banco estiver vazio"""
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] > 0:
        return
    
    from werkzeug.security import generate_password_hash
    
   
    restaurantes = [
        ('Pizzaria Bella', 'pizzaria@example.com', 'restaurante'),
        ('Hamburgueria Top', 'burger@example.com', 'restaurante'),
    ]
    
    for nome, email, perfil in restaurantes:
        senha_hash = generate_password_hash('123456')
        cursor.execute("""
            INSERT INTO usuarios (nome, email, senha_hash, perfil)
            VALUES (?, ?, ?, ?)
        """, (nome, email, senha_hash, perfil))
    
    
    senha_hash = generate_password_hash('123456')
    cursor.execute("""
        INSERT INTO usuarios (nome, email, senha_hash, perfil)
        VALUES (?, ?, ?, ?)
    """, ('João Cliente', 'cliente@example.com', senha_hash, 'cliente'))
    
    
    produtos_pizzaria = [
        (1, 'Pizza Margherita', 'Molho de tomate, mussarela e manjericão', 35.00),
        (1, 'Pizza Calabresa', 'Molho de tomate, mussarela e calabresa', 38.00),
        (1, 'Pizza Quatro Queijos', 'Mussarela, parmesão, gorgonzola e provolone', 42.00),
    ]
    
    produtos_hamburgueria = [
        (2, 'X-Burger', 'Hambúrguer, queijo, alface e tomate', 25.00),
        (2, 'X-Bacon', 'Hambúrguer, queijo, bacon, alface e tomate', 28.00),
        (2, 'X-Tudo', 'Hambúrguer, queijo, bacon, ovo, alface, tomate', 32.00),
    ]
    
    for rest_id, nome, desc, preco in produtos_pizzaria + produtos_hamburgueria:
        cursor.execute("""
            INSERT INTO produtos (restaurante_id, nome, descricao, preco, disponivel)
            VALUES (?, ?, ?, ?, 1)
        """, (rest_id, nome, desc, preco))
    
    conn.commit()
    print("✅ Dados de exemplo criados!")
    print("📝 Login de teste:")
    print("   Restaurante: pizzaria@example.com / 123456")
    print("   Restaurante: burger@example.com / 123456")
    print("   Cliente: cliente@example.com / 123456")