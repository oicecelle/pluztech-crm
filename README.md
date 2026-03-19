# Pluz Tech CRM — Guia de Instalação na VPS

## Pré-requisitos
- Node.js 18+ instalado na VPS
- Supabase com o schema já executado
- Nginx (ou Caddy) para servir o app

---

## Passo 1 — Copiar o projeto para a VPS

No seu computador, compacte a pasta e envie via SCP ou Git:
```bash
scp -r pluztech-crm/ usuario@IP_DA_VPS:/var/www/pluztech-crm
```

Ou clone se estiver num repositório:
```bash
git clone https://github.com/seu-usuario/pluztech-crm.git /var/www/pluztech-crm
```

---

## Passo 2 — Configurar variáveis de ambiente

```bash
cd /var/www/pluztech-crm
cp .env.example .env
nano .env
```

Preencha com suas credenciais do Supabase:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Onde encontrar:
- Acesse https://supabase.com/dashboard
- Selecione seu projeto
- Vá em Settings → API
- Copie "Project URL" e "anon public"

---

## Passo 3 — Instalar dependências e buildar

```bash
cd /var/www/pluztech-crm
npm install
npm run build
```

Isso gera a pasta `dist/` com os arquivos prontos para produção.

---

## Passo 4 — Configurar Nginx

Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/pluztech-crm
```

Cole o conteúdo:
```nginx
server {
    listen 80;
    server_name crm.seudominio.com.br;

    root /var/www/pluztech-crm/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Ative e reinicie:
```bash
sudo ln -s /etc/nginx/sites-available/pluztech-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Passo 5 — SSL com Certbot (opcional mas recomendado)

```bash
sudo certbot --nginx -d crm.seudominio.com.br
```

---

## Passo 6 — Configurar autenticação no Supabase

1. No Supabase Dashboard → Authentication → Users
2. Clique em "Add user"
3. Cadastre: marcellesantosgoncalves@gmail.com com a senha desejada
4. No SQL Editor, execute:
```sql
INSERT INTO users (auth_id, name, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'marcellesantosgoncalves@gmail.com'),
  'Marcelle',
  'marcellesantosgoncalves@gmail.com',
  'super_admin'
);
```

---

## Passo 7 — Configurar RLS no Supabase (segurança)

No SQL Editor, execute para cada tabela principal:
```sql
-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Política: usuário autenticado pode ler/escrever
CREATE POLICY "Authenticated users" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users" ON clinics
  FOR ALL USING (auth.role() = 'authenticated');

-- Repita para: crm_estagios, crm_status, crm_etiquetas,
-- crm_interesses, message_templates, disparos, disparo_leads,
-- leads_interesses, leads_etiquetas, lead_historico, lead_tarefas
```

---

## Atualizar o sistema depois

Sempre que fizer mudanças:
```bash
cd /var/www/pluztech-crm
git pull           # se usar git
npm run build
```

O Nginx serve automaticamente os novos arquivos.

---

## Estrutura de arquivos

```
pluztech-crm/
├── src/
│   ├── App.jsx          ← Interface principal do CRM
│   ├── main.jsx         ← Entrada React
│   ├── lib/
│   │   └── supabase.js  ← Configuração Supabase
│   └── hooks/
│       └── useCRM.js    ← Toda a lógica de dados
├── index.html
├── vite.config.js
├── package.json
└── .env                 ← Suas credenciais (NÃO commitar)
```
