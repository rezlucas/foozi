# Foozi - Landing Pages

Ambiente para hospedar landing pages estáticas (HTML/CSS/JS), com deploy automático via Vercel a cada push na branch `main`.

## Estrutura

Cada landing page fica em sua própria pasta na raiz do projeto:

```
/
├── index.html          # página inicial (raiz do site)
├── lp-exemplo/          # exemplo de LP
│   ├── index.html
│   ├── style.css
│   └── script.js
└── outra-lp/
    └── index.html
```

## Como criar uma nova LP

1. Crie uma pasta na raiz com o nome da LP (ex: `promo-natal/`).
2. Coloque o `index.html` (e demais arquivos) dentro dela. Referencie CSS/JS/imagens da própria LP com caminho absoluto a partir da raiz (`/promo-natal/style.css`), nunca relativo (`style.css`) — a Vercel serve a LP em `/promo-natal` sem barra final, e um caminho relativo resolveria para a raiz do site em vez da pasta da LP.
3. Faça commit e push para `main`.
4. A Vercel faz o deploy automaticamente. A LP fica disponível em:
   - `https://<dominio-do-projeto>.vercel.app/promo-natal`
   - ou em um domínio/subdomínio próprio configurado no painel da Vercel.

## Deploy

O projeto está conectado ao Vercel. Todo push na branch `main` gera um deploy automático em produção. Pull requests / outras branches geram deploys de preview.

## Domínio personalizado

Para apontar um domínio do cliente para esta LP, adicione o domínio no painel da Vercel (Project Settings → Domains) e configure o DNS conforme instruído pela própria Vercel (geralmente um registro `A` apontando para `76.76.21.21` ou um `CNAME` para `cname.vercel-dns.com`).
