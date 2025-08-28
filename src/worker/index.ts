import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { setCookie, getCookie } from "hono/cookie";
import { CreatePastaSchema, CreatePedidoSchema, UpdatePedidoStatusSchema } from "@/shared/types";
import { z } from "zod";

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

interface HonoContext {
  Bindings: Env;
  Variables: {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  };
}

const app = new Hono<HonoContext>();

app.use("*", cors());

// Local auth middleware
const localAuthMiddleware = async (c: any, next: any) => {
  try {
    // Get all possible session identifiers
    const sessionId = getCookie(c, 'session_id');
    const authCheck = getCookie(c, 'auth_check');
    const allCookies = c.req.raw.headers.get('cookie');
    
    console.log('Auth middleware check:', { 
      sessionId, 
      authCheck,
      allCookies,
      path: c.req.path,
      method: c.req.method,
      hasSessionCookie: !!sessionId,
      hasAuthCookie: !!authCheck
    });
    
    // Check for valid session - allow both session_id cookie and auth_check
    const isValidSession = (sessionId === 'admin_session') || (authCheck === 'logged_in');
    
    if (!isValidSession) {
      console.log('Authentication failed:', { 
        sessionId, 
        authCheck, 
        reason: 'No valid session found' 
      });
      return c.json({ 
        error: "Acesso negado. Faça login novamente.",
        debug: { sessionId: !!sessionId, authCheck: !!authCheck }
      }, 401);
    }

    console.log('Authentication successful for path:', c.req.path);
    // Set user context
    c.set('user', { id: '1', username: 'admin', role: 'ADMIN' });
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: "Erro interno de autenticação" }, 500);
  }
};

// Login schema
const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// Local authentication endpoints
app.post("/api/auth/login", zValidator("json", LoginSchema), async (c) => {
  const { username, password } = c.req.valid("json");
  
  console.log('Login attempt:', { username, hasPassword: !!password, adminPassword: !!c.env.ADMIN_PASSWORD });
  
  // Check credentials against environment variable
  if (username === 'admin' && password === c.env.ADMIN_PASSWORD) {
    // Set multiple session cookies for better compatibility
    setCookie(c, 'session_id', 'admin_session', {
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60,
    });

    setCookie(c, 'auth_check', 'logged_in', {
      httpOnly: false,
      path: "/",
      sameSite: "lax", 
      secure: false,
      maxAge: 24 * 60 * 60,
    });

    // Also try with different cookie settings for better browser compatibility
    setCookie(c, 'admin_auth', 'true', {
      httpOnly: false,
      path: "/",
      sameSite: "none",
      secure: false,
      maxAge: 24 * 60 * 60,
    });

    console.log('Login successful, multiple cookies set');
    
    return c.json({ 
      id: '1', 
      username: 'admin', 
      role: 'ADMIN',
      success: true
    }, 200);
  }

  console.log('Login failed: invalid credentials', { 
    providedUsername: username,
    expectedUsername: 'admin',
    passwordMatch: password === c.env.ADMIN_PASSWORD
  });
  return c.json({ error: "Usuário ou senha incorretos" }, 401);
});

app.get("/api/auth/me", async (c) => {
  try {
    // Check for valid session manually without middleware first
    const sessionId = getCookie(c, 'session_id');
    const authCheck = getCookie(c, 'auth_check');
    const adminAuth = getCookie(c, 'admin_auth');
    
    console.log('Auth me endpoint:', { 
      sessionId, 
      authCheck, 
      adminAuth,
      cookies: c.req.raw.headers.get('cookie')
    });
    
    const isValidSession = (sessionId === 'admin_session') || 
                          (authCheck === 'logged_in') || 
                          (adminAuth === 'true');
    
    if (isValidSession) {
      const userData = { id: '1', username: 'admin', role: 'ADMIN' };
      console.log('Auth me successful:', userData);
      return c.json(userData);
    } else {
      console.log('Auth me failed: no valid session');
      return c.json({ error: "Não autenticado" }, 401);
    }
  } catch (error) {
    console.error('Auth me error:', error);
    return c.json({ error: "Erro de autenticação" }, 500);
  }
});

app.post('/api/auth/logout', async (c) => {
  // Clear all auth cookies
  setCookie(c, 'session_id', '', {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    secure: false,
    maxAge: 0,
  });
  
  setCookie(c, 'auth_check', '', {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    secure: false,
    maxAge: 0,
  });

  setCookie(c, 'admin_auth', '', {
    httpOnly: false,
    path: '/',
    sameSite: 'none',
    secure: false,
    maxAge: 0,
  });

  console.log('User logged out, all cookies cleared');
  return c.json({ success: true }, 200);
});

// Image upload endpoint
app.post("/api/upload/image", localAuthMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return c.json({ error: "Nenhuma imagem foi enviada" }, 400);
    }

    if (!image.type.startsWith('image/')) {
      return c.json({ error: "Arquivo deve ser uma imagem" }, 400);
    }

    // For now, return a placeholder URL since we don't have image storage configured
    // In a real app, you would upload to Cloudflare Images or similar service
    return c.json({ 
      url: `https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=${encodeURIComponent(image.name)}`,
      message: "Funcionalidade de upload será implementada em produção" 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return c.json({ error: "Erro ao processar imagem" }, 500);
  }
});

// Pastas endpoints
app.get("/api/pastas", async (c) => {
  const search = c.req.query("search");
  const genero = c.req.query("genero");
  const minPreco = c.req.query("minPreco");
  const maxPreco = c.req.query("maxPreco");

  let query = "SELECT * FROM pastas WHERE is_active = 1";
  const params: any[] = [];

  if (search) {
    query += " AND (nome LIKE ? OR descricao LIKE ? OR codigo LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (genero) {
    query += " AND genero = ?";
    params.push(genero);
  }

  if (minPreco) {
    query += " AND preco >= ?";
    params.push(parseFloat(minPreco));
  }

  if (maxPreco) {
    query += " AND preco <= ?";
    params.push(parseFloat(maxPreco));
  }

  query += " ORDER BY nome ASC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.get("/api/pastas/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { results } = await c.env.DB.prepare("SELECT * FROM pastas WHERE id = ? AND is_active = 1").bind(id).all();
  
  if (results.length === 0) {
    return c.json({ error: "Pasta não encontrada" }, 404);
  }
  
  return c.json(results[0]);
});

app.post("/api/pastas", localAuthMiddleware, zValidator("json", CreatePastaSchema), async (c) => {
  const pasta = c.req.valid("json");
  
  // Generate codigo if not provided
  let codigo = pasta.codigo;
  if (!codigo) {
    const { results } = await c.env.DB.prepare("SELECT MAX(id) as max_id FROM pastas").all();
    const nextId = (results[0]?.max_id as number || 0) + 1;
    codigo = `MUS${nextId.toString().padStart(4, '0')}`;
  }
  
  const { success } = await c.env.DB.prepare(`
    INSERT INTO pastas (nome, codigo, qtd_musicas, tamanho_gb, preco, capa_url, descricao, genero, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    pasta.nome,
    codigo,
    pasta.qtd_musicas,
    pasta.tamanho_gb,
    pasta.preco,
    pasta.capa_url || null,
    pasta.descricao || null,
    pasta.genero || null,
    pasta.is_active
  ).run();

  if (!success) {
    return c.json({ error: "Erro ao criar pasta" }, 500);
  }

  return c.json({ message: "Pasta criada com sucesso" }, 201);
});

// Pedidos endpoints
app.post("/api/pedidos", zValidator("json", CreatePedidoSchema), async (c) => {
  const pedidoData = c.req.valid("json");
  
  // Get pasta details for cart items
  const pastaIds = pedidoData.itens.map(item => item.pasta_id);
  const placeholders = pastaIds.map(() => "?").join(",");
  const { results: pastas } = await c.env.DB.prepare(`
    SELECT * FROM pastas WHERE id IN (${placeholders}) AND is_active = 1
  `).bind(...pastaIds).all();

  if (pastas.length !== pedidoData.itens.length) {
    return c.json({ error: "Uma ou mais pastas não foram encontradas" }, 400);
  }

  // Calculate totals
  let total_gb = 0;
  let total_musicas = 0;
  let total_valor = 0;
  let total_itens = 0;

  const itensWithDetails = pedidoData.itens.map(item => {
    const pasta = pastas.find(p => p.id === item.pasta_id);
    if (!pasta) throw new Error("Pasta não encontrada");
    
    total_gb += (pasta.tamanho_gb as number) * item.quantidade;
    total_musicas += (pasta.qtd_musicas as number) * item.quantidade;
    total_valor += (pasta.preco as number) * item.quantidade;
    total_itens += item.quantidade;

    return {
      ...item,
      pasta
    };
  });

  // Validate pendrive capacity
  if (total_gb > pedidoData.pendrive_gb) {
    return c.json({ 
      error: "Capacidade do pendrive insuficiente",
      total_gb,
      pendrive_gb: pedidoData.pendrive_gb
    }, 400);
  }

  // Create pedido
  const historico = JSON.stringify([{
    status: 'ENVIADO',
    timestamp: new Date().toISOString(),
    usuario: 'Sistema'
  }]);

  const { success: pedidoSuccess, meta } = await c.env.DB.prepare(`
    INSERT INTO pedidos (cliente_nome, cliente_contato, pendrive_gb, forma_pagamento, status, observacoes, total_gb, total_itens, total_musicas, total_valor, historico_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    pedidoData.cliente_nome,
    pedidoData.cliente_contato,
    pedidoData.pendrive_gb,
    pedidoData.forma_pagamento,
    'ENVIADO',
    pedidoData.observacoes || null,
    total_gb,
    total_itens,
    total_musicas,
    total_valor,
    historico
  ).run();

  if (!pedidoSuccess || !meta.last_row_id) {
    return c.json({ error: "Erro ao criar pedido" }, 500);
  }

  const pedidoId = meta.last_row_id;

  // Create pedido items
  for (const item of itensWithDetails) {
    await c.env.DB.prepare(`
      INSERT INTO pedido_itens (pedido_id, pasta_id, nome_pasta, qtd_musicas, tamanho_gb, preco_unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      pedidoId,
      item.pasta_id,
      item.pasta.nome as string,
      item.pasta.qtd_musicas as number,
      item.pasta.tamanho_gb as number,
      item.pasta.preco as number
    ).run();
  }

  return c.json({ 
    message: "Pedido criado com sucesso",
    pedido_id: pedidoId,
    total_valor,
    total_gb
  }, 201);
});

app.get("/api/pedidos", async (c) => {
  const status = c.req.query("status");
  const inicio = c.req.query("inicio");
  const fim = c.req.query("fim");

  let query = "SELECT * FROM pedidos WHERE 1=1";
  const params: any[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  if (inicio) {
    query += " AND DATE(created_at) >= ?";
    params.push(inicio);
  }

  if (fim) {
    query += " AND DATE(created_at) <= ?";
    params.push(fim);
  }

  query += " ORDER BY created_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

// Get delivered orders - MUST come before /api/pedidos/:id route
app.get("/api/pedidos/entregues", localAuthMiddleware, async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM pedidos 
    WHERE status = 'ENTREGUE' 
    ORDER BY updated_at DESC 
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const { results: total } = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM pedidos WHERE status = 'ENTREGUE'
  `).all();

  return c.json({
    pedidos: results,
    pagination: {
      page,
      limit,
      total: (total[0] as any).count,
      totalPages: Math.ceil((total[0] as any).count / limit)
    }
  });
});

app.get("/api/pedidos/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  
  const { results: pedidos } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (pedidos.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const { results: itens } = await c.env.DB.prepare("SELECT * FROM pedido_itens WHERE pedido_id = ?").bind(id).all();

  return c.json({
    ...pedidos[0],
    itens
  });
});

app.put("/api/pastas/:id", localAuthMiddleware, zValidator("json", CreatePastaSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const pasta = c.req.valid("json");
  
  const { success } = await c.env.DB.prepare(`
    UPDATE pastas 
    SET nome = ?, codigo = ?, qtd_musicas = ?, tamanho_gb = ?, preco = ?, capa_url = ?, descricao = ?, genero = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    pasta.nome,
    pasta.codigo || null,
    pasta.qtd_musicas,
    pasta.tamanho_gb,
    pasta.preco,
    pasta.capa_url || null,
    pasta.descricao || null,
    pasta.genero || null,
    pasta.is_active,
    id
  ).run();

  if (!success) {
    return c.json({ error: "Erro ao atualizar pasta" }, 500);
  }

  return c.json({ message: "Pasta atualizada com sucesso" });
});

app.delete("/api/pastas/:id", localAuthMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  // Check if pasta is used in any pedido items
  const { results: usedInPedidos } = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM pedido_itens WHERE pasta_id = ?
  `).bind(id).all();

  if ((usedInPedidos[0] as any).count > 0) {
    return c.json({ 
      error: "Não é possível excluir esta pasta pois ela está em uso em pedidos existentes" 
    }, 400);
  }
  
  // Delete the pasta completely
  const { success } = await c.env.DB.prepare(`
    DELETE FROM pastas WHERE id = ?
  `).bind(id).run();

  if (!success) {
    return c.json({ error: "Erro ao deletar pasta" }, 500);
  }

  return c.json({ message: "Pasta deletada com sucesso" });
});

// Database management endpoints
app.delete("/api/admin/clear-pastas", localAuthMiddleware, async (c) => {
  try {
    // Check if any pastas are used in pedidos
    const { results: usedPastas } = await c.env.DB.prepare(`
      SELECT DISTINCT pasta_id FROM pedido_itens
    `).all();

    if (usedPastas.length > 0) {
      const usedIds = usedPastas.map((p: any) => p.pasta_id);
      // Only delete unused pastas
      await c.env.DB.prepare(`
        DELETE FROM pastas WHERE id NOT IN (${usedIds.map(() => '?').join(',')})
      `).bind(...usedIds).run();
      
      return c.json({ 
        message: `Pastas não utilizadas foram excluídas. ${usedIds.length} pastas foram mantidas por estarem em uso.`,
        kept_count: usedIds.length
      });
    } else {
      // Delete all pastas
      await c.env.DB.prepare("DELETE FROM pastas").run();
      
      return c.json({ message: "Todas as pastas foram excluídas com sucesso" });
    }
  } catch (error) {
    console.error('Error clearing pastas:', error);
    return c.json({ error: "Erro ao excluir pastas" }, 500);
  }
});

app.delete("/api/admin/clear-pedidos", localAuthMiddleware, async (c) => {
  try {
    // Delete all pedido items first
    await c.env.DB.prepare("DELETE FROM pedido_itens").run();
    
    // Delete all pedidos
    await c.env.DB.prepare("DELETE FROM pedidos").run();
    
    return c.json({ message: "Todos os pedidos foram excluídos com sucesso" });
  } catch (error) {
    console.error('Error clearing pedidos:', error);
    return c.json({ error: "Erro ao excluir pedidos" }, 500);
  }
});

app.delete("/api/admin/clear-all", localAuthMiddleware, async (c) => {
  try {
    // Delete in correct order to respect foreign key relationships
    await c.env.DB.prepare("DELETE FROM pedido_itens").run();
    await c.env.DB.prepare("DELETE FROM pedidos").run();
    await c.env.DB.prepare("DELETE FROM pastas").run();
    
    return c.json({ message: "Todos os dados foram excluídos com sucesso" });
  } catch (error) {
    console.error('Error clearing all data:', error);
    return c.json({ error: "Erro ao excluir todos os dados" }, 500);
  }
});

// Database stats endpoint
app.get("/api/admin/database-stats", localAuthMiddleware, async (c) => {
  try {
    const { results: pastasCount } = await c.env.DB.prepare("SELECT COUNT(*) as count FROM pastas").all();
    const { results: pedidosCount } = await c.env.DB.prepare("SELECT COUNT(*) as count FROM pedidos").all();
    const { results: pedidoItensCount } = await c.env.DB.prepare("SELECT COUNT(*) as count FROM pedido_itens").all();
    const { results: usedPastasCount } = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT pasta_id) as count FROM pedido_itens
    `).all();
    
    return c.json({
      pastas: (pastasCount[0] as any).count,
      pedidos: (pedidosCount[0] as any).count,
      pedido_itens: (pedidoItensCount[0] as any).count,
      pastas_em_uso: (usedPastasCount[0] as any).count
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    return c.json({ error: "Erro ao obter estatísticas" }, 500);
  }
});

app.put("/api/pedidos/:id/status", localAuthMiddleware, zValidator("json", UpdatePedidoStatusSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const { status } = c.req.valid("json");

  // Get current pedido
  const { results } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (results.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const pedido = results[0];
  const historico = JSON.parse((pedido.historico_status as string) || '[]');
  
  // Add status change to history
  historico.push({
    status,
    timestamp: new Date().toISOString(),
    usuario: 'Admin' // TODO: Get from auth context
  });

  const { success } = await c.env.DB.prepare(`
    UPDATE pedidos 
    SET status = ?, historico_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, JSON.stringify(historico), id).run();

  if (!success) {
    return c.json({ error: "Erro ao atualizar status" }, 500);
  }

  return c.json({ message: "Status atualizado com sucesso" });
});

// Print receipt endpoint - optimized for standard printer
app.get("/api/pedidos/:id/print", localAuthMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  const { results: pedidos } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (pedidos.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const { results: itens } = await c.env.DB.prepare(`
    SELECT pi.*, p.codigo 
    FROM pedido_itens pi 
    LEFT JOIN pastas p ON pi.pasta_id = p.id 
    WHERE pi.pedido_id = ?
  `).bind(id).all();
  
  const pedido = pedidos[0] as any;
  
  // Helper functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatSize = (sizeGB: number) => {
    if (sizeGB < 1) {
      return `${(sizeGB * 1024).toFixed(0)} MB`;
    }
    return `${sizeGB.toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formasPagamento = {
    'DINHEIRO': 'Dinheiro',
    'PIX': 'PIX',
    'CARTAO_DEBITO': 'Cartão Débito',
    'CARTAO_CREDITO': 'Cartão Crédito'
  };

  // Build clean HTML receipt for printing
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Pedido #${pedido.id} - MusicaDrive</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 13px; 
            line-height: 1.1;
            margin: 0;
            padding: 20px;
            color: #000;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 14px;
            margin-bottom: 10px;
          }
          .order-info {
            text-align: center;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .section {
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .item {
            margin-bottom: 5px;
            padding: 2px 0;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .item-details {
            font-size: 12px;
            margin-bottom: 1px;
          }
          .item-price {
            text-align: right;
            font-weight: bold;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .total {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            border: 2px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .status {
            text-align: center;
            margin: 15px 0;
            font-weight: bold;
            text-transform: uppercase;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 10px; 
              font-size: 12px;
            }
            .header {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">MUSICADRIVE</div>
          <div class="subtitle">Pastas Musicais</div>
        </div>

        <div class="order-info">
          <div>PEDIDO #${pedido.id}</div>
          <div>${formatDate(pedido.created_at)}</div>
        </div>

        <div class="section">
          <div class="section-title">Cliente</div>
          <div><strong>Nome:</strong> ${pedido.cliente_nome}</div>
          <div><strong>Contato:</strong> ${pedido.cliente_contato}</div>
          ${pedido.forma_pagamento ? `<div><strong>Pagamento:</strong> ${formasPagamento[pedido.forma_pagamento as keyof typeof formasPagamento] || pedido.forma_pagamento}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Itens do Pedido</div>
          ${(itens as any[]).map((item, index) => {
            const codigo = item.codigo || `MUS${item.pasta_id.toString().padStart(4, '0')}`;
            return `
              <div class="item">
                <div class="item-name">${index + 1}. ${item.nome_pasta}</div>
                <div class="item-details">Código: ${codigo}</div>
                <div class="item-details">${item.qtd_musicas} músicas • ${formatSize(item.tamanho_gb)}</div>
                <div class="item-price">${formatPrice(item.preco_unit)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="section">
          <div class="section-title">Resumo</div>
          <div class="summary-row">
            <span>Total de Itens:</span>
            <span>${pedido.total_itens}</span>
          </div>
          <div class="summary-row">
            <span>Total de Músicas:</span>
            <span>${pedido.total_musicas?.toLocaleString('pt-BR') || '0'}</span>
          </div>
          <div class="summary-row">
            <span>Tamanho Total:</span>
            <span>${formatSize(pedido.total_gb)}</span>
          </div>
          <div class="summary-row">
            <span>Pendrive:</span>
            <span>${pedido.pendrive_gb} GB</span>
          </div>
        </div>

        <div class="total">
          TOTAL: ${formatPrice(pedido.total_valor)}
        </div>

        <div class="status">
          Status: ${pedido.status}
        </div>

        ${pedido.observacoes ? `
          <div class="section">
            <div class="section-title">Observações</div>
            <div>${pedido.observacoes}</div>
          </div>
        ` : ''}

        <div class="footer">
          <div>Obrigado pela preferência!</div>
          <div>Volte sempre!</div>
        </div>
      </body>
    </html>
  `;

  return c.html(receiptHtml, 200);
});

// Update pedido endpoint with validation
app.put("/api/pedidos/:id", localAuthMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  const updates = await c.req.json();
  
  // Get current pedido
  const { results } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (results.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const pedido = results[0] as any;
  
  // Only allow editing if not delivered or cancelled
  if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') {
    return c.json({ error: "Não é possível editar pedidos entregues ou cancelados" }, 400);
  }

  // Update allowed fields
  const allowedFields = ['cliente_nome', 'cliente_contato', 'forma_pagamento', 'observacoes'];
  const updateFields = [];
  const updateValues = [];
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(updates[field]);
    }
  }
  
  if (updateFields.length === 0) {
    return c.json({ error: "Nenhum campo válido para atualizar" }, 400);
  }
  
  updateValues.push(id);
  
  const { success } = await c.env.DB.prepare(`
    UPDATE pedidos 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(...updateValues).run();

  if (!success) {
    return c.json({ error: "Erro ao atualizar pedido" }, 500);
  }

  return c.json({ message: "Pedido atualizado com sucesso" });
});

// Delete pedido endpoint
app.delete("/api/pedidos/:id", localAuthMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  // Get current pedido
  const { results } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (results.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const pedido = results[0] as any;
  
  // Only allow deleting if not delivered
  if (pedido.status === 'ENTREGUE') {
    return c.json({ error: "Não é possível excluir pedidos entregues" }, 400);
  }

  // Delete pedido items first
  await c.env.DB.prepare("DELETE FROM pedido_itens WHERE pedido_id = ?").bind(id).run();
  
  // Delete pedido
  const { success } = await c.env.DB.prepare("DELETE FROM pedidos WHERE id = ?").bind(id).run();

  if (!success) {
    return c.json({ error: "Erro ao excluir pedido" }, 500);
  }

  return c.json({ message: "Pedido excluído com sucesso" });
});

// Update pedido items endpoint
app.put("/api/pedidos/:id/itens", localAuthMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  const { itens } = await c.req.json();
  
  console.log('Updating pedido items:', { pedidoId: id, itens });
  
  // Validate input
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return c.json({ error: "Lista de itens é obrigatória" }, 400);
  }

  // Get current pedido
  const { results } = await c.env.DB.prepare("SELECT * FROM pedidos WHERE id = ?").bind(id).all();
  
  if (results.length === 0) {
    return c.json({ error: "Pedido não encontrado" }, 404);
  }

  const pedido = results[0] as any;
  
  // Only allow editing if not delivered or cancelled
  if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') {
    return c.json({ error: "Não é possível editar pedidos entregues ou cancelados" }, 400);
  }

  // Get unique pasta IDs
  const uniquePastaIds = [...new Set(itens.map((item: any) => item.pasta_id))];
  console.log('Unique pasta IDs:', uniquePastaIds);
  
  if (uniquePastaIds.length === 0) {
    return c.json({ error: "Nenhuma pasta válida encontrada" }, 400);
  }

  // Validate pastas exist and are active
  const placeholders = uniquePastaIds.map(() => "?").join(",");
  const { results: pastas } = await c.env.DB.prepare(`
    SELECT * FROM pastas WHERE id IN (${placeholders}) AND is_active = 1
  `).bind(...uniquePastaIds).all();

  console.log('Found pastas:', pastas.length, 'Expected:', uniquePastaIds.length);

  if (pastas.length !== uniquePastaIds.length) {
    const foundIds = pastas.map(p => p.id);
    const missingIds = uniquePastaIds.filter(id => !foundIds.includes(id));
    console.error('Missing pasta IDs:', missingIds);
    return c.json({ 
      error: "Uma ou mais pastas não foram encontradas ou estão inativas",
      missingIds,
      foundIds
    }, 400);
  }

  // Calculate new totals
  let total_gb = 0;
  let total_musicas = 0;
  let total_valor = 0;
  let total_itens = 0;

  const itensWithDetails = itens.map((item: any) => {
    const pasta = pastas.find(p => p.id === item.pasta_id);
    if (!pasta) {
      console.error('Pasta not found for ID:', item.pasta_id);
      throw new Error(`Pasta não encontrada: ${item.pasta_id}`);
    }
    
    const quantidade = Math.max(1, item.quantidade || 1);
    total_gb += (pasta.tamanho_gb as number) * quantidade;
    total_musicas += (pasta.qtd_musicas as number) * quantidade;
    total_valor += (pasta.preco as number) * quantidade;
    total_itens += quantidade;

    return {
      pasta_id: item.pasta_id,
      quantidade,
      pasta
    };
  });

  console.log('Calculated totals:', { total_gb, total_musicas, total_valor, total_itens });

  // Validate pendrive capacity
  if (total_gb > pedido.pendrive_gb) {
    return c.json({ 
      error: "Capacidade do pendrive insuficiente",
      total_gb,
      pendrive_gb: pedido.pendrive_gb
    }, 400);
  }

  // Delete existing items
  const deleteResult = await c.env.DB.prepare("DELETE FROM pedido_itens WHERE pedido_id = ?").bind(id).run();
  console.log('Deleted existing items:', deleteResult);

  // Create new items - one record per quantity unit
  for (const item of itensWithDetails) {
    for (let i = 0; i < item.quantidade; i++) {
      const insertResult = await c.env.DB.prepare(`
        INSERT INTO pedido_itens (pedido_id, pasta_id, nome_pasta, qtd_musicas, tamanho_gb, preco_unit)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        item.pasta_id,
        item.pasta.nome as string,
        item.pasta.qtd_musicas as number,
        item.pasta.tamanho_gb as number,
        item.pasta.preco as number
      ).run();
      
      if (!insertResult.success) {
        console.error('Failed to insert item:', item);
        throw new Error('Erro ao inserir item');
      }
    }
  }

  // Update pedido totals
  const { success } = await c.env.DB.prepare(`
    UPDATE pedidos 
    SET total_gb = ?, total_itens = ?, total_musicas = ?, total_valor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(total_gb, total_itens, total_musicas, total_valor, id).run();

  if (!success) {
    return c.json({ error: "Erro ao atualizar pedido" }, 500);
  }

  return c.json({ message: "Itens do pedido atualizados com sucesso" });
});

// Admin endpoints
app.get("/api/admin/pastas", localAuthMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM pastas ORDER BY created_at DESC").all();
  return c.json(results);
});

// Print report for 80mm printers
app.get("/api/admin/relatorios/print", localAuthMiddleware, async (c) => {
  const dataInicio = c.req.query("dataInicio");
  const dataFim = c.req.query("dataFim");
  const status = c.req.query("status");
  const formaPagamento = c.req.query("formaPagamento");

  if (!dataInicio || !dataFim) {
    return c.json({ error: "Data de início e fim são obrigatórias" }, 400);
  }

  let whereClause = "WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?";
  const params: any[] = [dataInicio, dataFim];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  if (formaPagamento) {
    whereClause += " AND p.forma_pagamento = ?";
    params.push(formaPagamento);
  }

  try {
    // Resumo geral - fixed query with table aliases
    const { results: resumo } = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as totalPedidos,
        COALESCE(SUM(p.total_valor), 0) as totalValor,
        COALESCE(SUM(p.total_itens), 0) as totalItens,
        COALESCE(SUM(p.total_musicas), 0) as totalMusicas,
        COALESCE(AVG(p.total_valor), 0) as ticketMedio
      FROM pedidos p ${whereClause}
    `).bind(...params).all();

    // Vendas por status
    const { results: vendasPorStatus } = await c.env.DB.prepare(`
      SELECT 
        p.status,
        COUNT(*) as pedidos,
        COALESCE(SUM(p.total_valor), 0) as valor
      FROM pedidos p ${whereClause}
      GROUP BY p.status
      ORDER BY valor DESC
    `).bind(...params).all();

    // Vendas por forma de pagamento
    const { results: vendasPorPagamento } = await c.env.DB.prepare(`
      SELECT 
        COALESCE(p.forma_pagamento, 'Não informado') as forma,
        COUNT(*) as pedidos,
        COALESCE(SUM(p.total_valor), 0) as valor
      FROM pedidos p ${whereClause}
      GROUP BY p.forma_pagamento
      ORDER BY valor DESC
    `).bind(...params).all();

    // Top 5 pastas mais vendidas
    const { results: topPastas } = await c.env.DB.prepare(`
      SELECT 
        pi.nome_pasta as nome,
        COUNT(*) as quantidade,
        COALESCE(SUM(pi.preco_unit), 0) as valor
      FROM pedido_itens pi
      JOIN pedidos p ON pi.pedido_id = p.id
      WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
      ${status ? 'AND p.status = ?' : ''}
      ${formaPagamento ? 'AND p.forma_pagamento = ?' : ''}
      GROUP BY pi.nome_pasta
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `).bind(...params).all();

    const relatorio = resumo[0] as any;

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusLabel = (status: string) => {
      const labels = {
        'ENVIADO': 'Enviado',
        'EM_SEPARACAO': 'Em Separação',
        'PRONTO': 'Pronto',
        'ENTREGUE': 'Entregue',
        'CANCELADO': 'Cancelado'
      };
      return labels[status as keyof typeof labels] || status;
    };

    const getFormaPagamentoLabel = (forma: string) => {
      const labels = {
        'DINHEIRO': 'Dinheiro',
        'PIX': 'PIX',
        'CARTAO_DEBITO': 'Cartão Débito',
        'CARTAO_CREDITO': 'Cartão Crédito'
      };
      return labels[forma as keyof typeof labels] || forma;
    };

    // Generate 80mm thermal printer optimized HTML
    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório Financeiro - MusicaDrive</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              line-height: 1.1;
              margin: 0;
              padding: 8px;
              color: #000;
              background: #fff;
              width: 80mm;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .subtitle {
              font-size: 12px;
              margin-bottom: 8px;
            }
            .period {
              text-align: center;
              margin-bottom: 12px;
              font-weight: bold;
              font-size: 10px;
            }
            .section {
              margin-bottom: 8px;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 3px;
              text-transform: uppercase;
              font-size: 10px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              font-size: 10px;
            }
            .summary-value {
              font-weight: bold;
            }
            .total {
              font-size: 13px;
              font-weight: bold;
              text-align: center;
              margin: 10px 0;
              padding: 8px;
              border: 2px solid #000;
            }
            .item {
              margin-bottom: 3px;
              font-size: 10px;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 1px;
            }
            .item-detail {
              display: flex;
              justify-content: space-between;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              border-top: 2px solid #000;
              padding-top: 8px;
              font-size: 10px;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 5px; 
                width: 80mm;
                max-width: 80mm;
              }
              .section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">MUSICADRIVE</div>
            <div class="subtitle">Relatório Financeiro</div>
          </div>

          <div class="period">
            Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}
            ${status ? `<br>Status: ${getStatusLabel(status)}` : ''}
            ${formaPagamento ? `<br>Pagamento: ${getFormaPagamentoLabel(formaPagamento)}` : ''}
          </div>

          <div class="section">
            <div class="section-title">Resumo Geral</div>
            <div class="summary-row">
              <span>Total Pedidos:</span>
              <span class="summary-value">${relatorio.totalPedidos}</span>
            </div>
            <div class="summary-row">
              <span>Total Itens:</span>
              <span class="summary-value">${relatorio.totalItens}</span>
            </div>
            <div class="summary-row">
              <span>Total Músicas:</span>
              <span class="summary-value">${relatorio.totalMusicas?.toLocaleString('pt-BR') || '0'}</span>
            </div>
            <div class="summary-row">
              <span>Ticket Médio:</span>
              <span class="summary-value">${formatPrice(relatorio.ticketMedio)}</span>
            </div>
          </div>

          <div class="total">
            FATURAMENTO TOTAL<br>
            ${formatPrice(relatorio.totalValor)}
          </div>

          ${vendasPorStatus.length > 0 ? `
            <div class="section">
              <div class="section-title">Por Status</div>
              ${(vendasPorStatus as any[]).map(item => `
                <div class="item">
                  <div class="item-name">${getStatusLabel(item.status)}</div>
                  <div class="item-detail">
                    <span>${item.pedidos} pedidos</span>
                    <span>${formatPrice(item.valor)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${vendasPorPagamento.length > 0 ? `
            <div class="section">
              <div class="section-title">Por Pagamento</div>
              ${(vendasPorPagamento as any[]).map(item => `
                <div class="item">
                  <div class="item-name">${getFormaPagamentoLabel(item.forma)}</div>
                  <div class="item-detail">
                    <span>${item.pedidos} pedidos</span>
                    <span>${formatPrice(item.valor)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${topPastas.length > 0 ? `
            <div class="section">
              <div class="section-title">Top 5 Pastas</div>
              ${(topPastas as any[]).slice(0, 5).map((pasta, index) => `
                <div class="item">
                  <div class="item-name">${index + 1}. ${pasta.nome}</div>
                  <div class="item-detail">
                    <span>${pasta.quantidade} vendas</span>
                    <span>${formatPrice(pasta.valor)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="footer">
            <div>Relatório gerado em:</div>
            <div>${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </body>
      </html>
    `;

    return c.html(reportHtml, 200);
  } catch (error) {
    console.error('Error generating print report:', error);
    return c.json({ error: "Erro ao gerar relatório para impressão" }, 500);
  }
});

// Reports endpoints  
app.get("/api/admin/relatorios", localAuthMiddleware, async (c) => {
  const dataInicio = c.req.query("dataInicio");
  const dataFim = c.req.query("dataFim");
  const status = c.req.query("status");
  const formaPagamento = c.req.query("formaPagamento");

  if (!dataInicio || !dataFim) {
    return c.json({ error: "Data de início e fim são obrigatórias" }, 400);
  }

  let whereClause = "WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?";
  const params: any[] = [dataInicio, dataFim];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  if (formaPagamento) {
    whereClause += " AND p.forma_pagamento = ?";
    params.push(formaPagamento);
  }

  try {
    // Resumo geral
    const { results: resumo } = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as totalPedidos,
        COALESCE(SUM(p.total_valor), 0) as totalValor,
        COALESCE(SUM(p.total_itens), 0) as totalItens,
        COALESCE(SUM(p.total_musicas), 0) as totalMusicas,
        COALESCE(AVG(p.total_valor), 0) as ticketMedio
      FROM pedidos p ${whereClause}
    `).bind(...params).all();

    // Vendas por dia
    const { results: vendasPorDia } = await c.env.DB.prepare(`
      SELECT 
        DATE(p.created_at) as data,
        COUNT(*) as pedidos,
        COALESCE(SUM(p.total_valor), 0) as valor
      FROM pedidos p ${whereClause}
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at)
    `).bind(...params).all();

    // Vendas por status
    const { results: vendasPorStatus } = await c.env.DB.prepare(`
      SELECT 
        p.status,
        COUNT(*) as pedidos,
        COALESCE(SUM(p.total_valor), 0) as valor
      FROM pedidos p ${whereClause}
      GROUP BY p.status
    `).bind(...params).all();

    // Vendas por forma de pagamento
    const { results: vendasPorPagamento } = await c.env.DB.prepare(`
      SELECT 
        COALESCE(p.forma_pagamento, 'Não informado') as forma,
        COUNT(*) as pedidos,
        COALESCE(SUM(p.total_valor), 0) as valor
      FROM pedidos p ${whereClause}
      GROUP BY p.forma_pagamento
    `).bind(...params).all();

    // Top pastas mais vendidas  
    const { results: topPastas } = await c.env.DB.prepare(`
      SELECT 
        pi.nome_pasta as nome,
        COUNT(*) as quantidade,
        COALESCE(SUM(pi.preco_unit), 0) as valor
      FROM pedido_itens pi
      JOIN pedidos p ON pi.pedido_id = p.id
      WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
      ${status ? 'AND p.status = ?' : ''}
      ${formaPagamento ? 'AND p.forma_pagamento = ?' : ''}
      GROUP BY pi.nome_pasta
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `).bind(...params).all();

    // Lista de pedidos detalhada
    const { results: pedidos } = await c.env.DB.prepare(`
      SELECT 
        p.id, p.cliente_nome, p.status, p.forma_pagamento, 
        p.total_valor, p.total_itens, p.created_at
      FROM pedidos p ${whereClause}
      ORDER BY p.created_at DESC
    `).bind(...params).all();

    return c.json({
      resumo: resumo[0],
      vendasPorDia,
      vendasPorStatus,
      vendasPorPagamento,
      topPastas,
      pedidos
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return c.json({ error: "Erro ao gerar relatório" }, 500);
  }
});

app.get("/api/admin/relatorios/export", localAuthMiddleware, async (c) => {
  const dataInicio = c.req.query("dataInicio");
  const dataFim = c.req.query("dataFim");
  const status = c.req.query("status");
  const formaPagamento = c.req.query("formaPagamento");

  if (!dataInicio || !dataFim) {
    return c.json({ error: "Data de início e fim são obrigatórias" }, 400);
  }

  let whereClause = "WHERE DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?";
  const params: any[] = [dataInicio, dataFim];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  if (formaPagamento) {
    whereClause += " AND p.forma_pagamento = ?";
    params.push(formaPagamento);
  }

  try {
    const { results: pedidos } = await c.env.DB.prepare(`
      SELECT 
        p.id as "ID",
        p.cliente_nome as "Cliente",
        p.cliente_contato as "Contato",
        p.status as "Status",
        p.forma_pagamento as "Forma de Pagamento",
        p.total_itens as "Total Itens",
        p.total_musicas as "Total Músicas",
        p.total_valor as "Total Valor",
        p.created_at as "Data Criação"
      FROM pedidos p ${whereClause}
      ORDER BY p.created_at DESC
    `).bind(...params).all();

    // Converter para CSV
    if (pedidos.length === 0) {
      return c.text("Nenhum pedido encontrado para o período selecionado", 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="relatorio_${dataInicio}_${dataFim}.csv"`
      });
    }

    const headers = Object.keys(pedidos[0] as any);
    const csvContent = [
      headers.join(','),
      ...pedidos.map((pedido: any) => 
        headers.map(header => {
          const value = pedido[header];
          // Escapar valores que contêm vírgulas ou aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return c.text(csvContent, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="relatorio_${dataInicio}_${dataFim}.csv"`
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    return c.json({ error: "Erro ao exportar relatório" }, 500);
  }
});

// Dashboard stats
app.get("/api/dashboard/stats", localAuthMiddleware, async (c) => {
  // Today's sales
  const { results: vendasHoje } = await c.env.DB.prepare(`
    SELECT COUNT(*) as pedidos, COALESCE(SUM(total_valor), 0) as valor
    FROM pedidos 
    WHERE DATE(created_at) = DATE('now')
  `).all();

  // Week's sales
  const { results: vendasSemana } = await c.env.DB.prepare(`
    SELECT COUNT(*) as pedidos, COALESCE(SUM(total_valor), 0) as valor
    FROM pedidos 
    WHERE DATE(created_at) >= DATE('now', '-7 days')
  `).all();

  // Month's sales
  const { results: vendasMes } = await c.env.DB.prepare(`
    SELECT COUNT(*) as pedidos, COALESCE(SUM(total_valor), 0) as valor
    FROM pedidos 
    WHERE DATE(created_at) >= DATE('now', 'start of month')
  `).all();

  // Latest 3 orders
  const { results: ultimosPedidos } = await c.env.DB.prepare(`
    SELECT * FROM pedidos 
    ORDER BY created_at DESC 
    LIMIT 3
  `).all();

  return c.json({
    vendasHoje: vendasHoje[0],
    vendasSemana: vendasSemana[0],
    vendasMes: vendasMes[0],
    ultimosPedidos
  });
});

export default app;
