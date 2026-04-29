# Plano — App de Organização Financeira Pessoal (MVP Web)

## Visão geral

Web app de finanças pessoais com lançamento manual no MVP, estrutura preparada para integrar **Pluggy (Open Finance)** na v2 e **React Native** depois reaproveitando 100% do backend. Estética **Cloud White** (azul SaaS, branco, cinza) — limpa, com bons respiros, gráficos claros.

Sincronização em tempo real entre dispositivos via **Supabase Realtime** (mesmo usuário logado em Web e, futuramente, no app Android, vê tudo atualizar instantaneamente).

---

## Arquitetura recomendada

**Frontend Web:** React + TanStack Start (já configurado no projeto), Tailwind, shadcn/ui, Recharts para gráficos.
**Backend:** Lovable Cloud (Supabase) — Postgres + Auth + Realtime + Storage + Edge Functions.
**Mobile (fase 2):** React Native + Expo, consumindo o mesmo Supabase. Lógica de negócio compartilhada via pacote `core/` (TypeScript puro: cálculos de preço médio, parcelas, IR).
**Open Finance (fase 2):** Pluggy (BR) — webhook + jobs de sincronização em Edge Function.
**Cotações B3:** BRAPI (gratuito) — Edge Function com cache de 15 min em tabela `quotes_cache` para respeitar rate limit.
**Tempo real:** Supabase Realtime nas tabelas `transactions`, `holdings`, `dividends`.
**Auth:** Email/senha + Google. RLS em todas as tabelas (user_id = auth.uid()).

---

## Módulos do MVP (escopo do que vou construir agora)

1. **Auth + Onboarding** — login, criar conta, escolher categorias iniciais.
2. **Dashboard** — entradas vs saídas do mês, donut por categoria, lista de próximas contas, saldo a receber, cards de resumo.
3. **Transações** — CRUD de despesas/receitas, categorias, busca, filtros por mês.
4. **Cartões de Crédito** — cadastro de cartões (limite, vencimento), faturas mensais, **compras parceladas** com indicador visual `2/12`, parcelas restantes e abatimento automático de limite.
5. **Despesas Contínuas** — financiamentos/consórcios com saldo devedor, meses restantes, barra de progresso.
6. **A Receber** — empréstimos a terceiros: nome, valor, prazo, status (Pendente/Recebido/Atrasado).
7. **Investimentos B3** — carteira de Ações e FIIs, lançamento de compras (data/qtd/preço), **preço médio** calculado automaticamente, cotação atual via BRAPI, variação %.
8. **Dividendos** — registro manual de proventos (ativo, data, valor líquido, corretora, tipo: dividendo/JCP/rendimento), calendário mensal, totais por ativo.
9. **Assistente IRPF** — relatório anual com duas abas:
   - **Bens e Direitos:** por ativo — CNPJ, qtd em 31/12, custo total de aquisição, texto pronto para copiar.
   - **Rendimentos:** somatório anual de dividendos/JCP por CNPJ, separados em isentos vs tributáveis.

**Fora do MVP (fase 2, plano separado):** integração Pluggy, app React Native, importação OFX/CSV, notificações push.

---

## Modelagem do banco (tabelas principais)

```text
profiles            id (=auth.uid), name, avatar_url, created_at
categories          id, user_id, name, kind(income|expense), color, icon
accounts            id, user_id, name, type(checking|savings|wallet), balance
credit_cards        id, user_id, name, brand, limit_total, closing_day, due_day, color
transactions        id, user_id, account_id?, card_id?, category_id, date,
                    amount, kind(income|expense), description, is_installment,
                    installment_purchase_id?, installment_index?
installment_purchases id, user_id, card_id, description, total_amount,
                    installments_total, first_date, category_id
ongoing_expenses    id, user_id, description, total_amount, paid_amount,
                    months_total, months_paid, monthly_value, start_date
receivables         id, user_id, debtor_name, amount, due_date,
                    status(pending|paid|overdue), notes
assets              id, ticker(BBAS3...), kind(stock|fii), name, cnpj
holdings_lots       id, user_id, asset_id, broker, date, quantity, unit_price
dividends           id, user_id, asset_id, broker, payment_date,
                    type(dividend|jcp|rendimento), gross, net
quotes_cache        ticker, price, updated_at
```

RLS: toda tabela com `user_id` filtra por `auth.uid()`. `assets` e `quotes_cache` são leitura pública.

**Cálculos derivados (views/funções):**
- `v_card_invoice(card_id, month)` — fatura agregando transações + parcelas ativas.
- `fn_average_price(asset_id, user_id)` — preço médio ponderado por lote.
- `fn_irpf_position(user_id, year)` — posição em 31/12 e custo total.

---

## Wireframe — Dashboard

```text
┌─────────────────────────────────────────────────────────────┐
│  ◐ Finanças            Outubro 2026  ▾         🔔  👤 João  │
├──────┬──────────────────────────────────────────────────────┤
│      │                                                       │
│ 🏠   │   Olá, João                                           │
│ 💳   │   Visão geral de Outubro                              │
│ 📊   │                                                       │
│ 📈   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│ 💰   │   │ Entradas │ │  Saídas  │  │  Saldo   │ │ A Receb.│ │
│ 📑   │   │ R$ 8.420 │ │ R$ 5.190 │  │ R$ 3.230 │ │  R$ 750 │ │
│      │   │   ↑ 4%   │ │   ↓ 2%   │  │  ↑ 12%   │ │ 2 itens │ │
│      │   └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│      │                                                       │
│      │   ┌─────────────────────────┐ ┌──────────────────┐   │
│      │   │ Despesas por categoria  │ │ Próximas contas  │   │
│      │   │                         │ │                  │   │
│      │   │      ◐  donut suave     │ │ • Aluguel  03/11 │   │
│      │   │   Alimentação ▇▇ 32%    │ │ • Internet 05/11 │   │
│      │   │   Aluguel    ▇  28%    │ │ • Cartão   10/11 │   │
│      │   │   Cartão     ▇  21%    │ │ • Energia  15/11 │   │
│      │   │   Internet   ▏   8%    │ │                  │   │
│      │   │   Extras     ▏  11%    │ │      ver todas → │   │
│      │   └─────────────────────────┘ └──────────────────┘   │
│      │                                                       │
│      │   Cartões                                  + Novo    │
│      │   ┌───────────────┐  ┌───────────────┐               │
│      │   │ Nubank  ●●●●  │  │ Itaú    ●●●●  │               │
│      │   │ R$1.842/3.500 │  │ R$ 920/2.000  │               │
│      │   │ ▇▇▇▇▏░░  53%  │  │ ▇▇▏░░░░  46%  │               │
│      │   │ fecha em 8d   │  │ fecha em 14d  │               │
│      │   └───────────────┘  └───────────────┘               │
└──────┴──────────────────────────────────────────────────────┘
```

Princípios visuais: muito espaço em branco, divisores sutis cinza-claro, **um único azul de destaque (#3b82f6)** para ações e dados positivos, vermelho discreto só em alertas, tipografia leve com números grandes nos KPIs.

## Wireframe — Investimentos

```text
┌─────────────────────────────────────────────────────────────┐
│  Investimentos                              + Lançar compra │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Patrimônio total                                           │
│   R$ 47.382,50            ↑ R$ 1.240 (2,7%) este mês        │
│                                                              │
│   ▁▂▃▅▇▆▇▇  gráfico linha 12 meses, finíssimo               │
│                                                              │
│   [ Carteira ]  Dividendos   IRPF                           │
│   ─────────────────────────────────────────                 │
│                                                              │
│   Ações                                       R$ 28.110     │
│   ┌────────┬──────┬──────────┬──────────┬─────────┬──────┐  │
│   │ Ativo  │ Qtd  │ P. Médio │ Cotação  │ Valor   │  %   │  │
│   ├────────┼──────┼──────────┼──────────┼─────────┼──────┤  │
│   │ BBAS3  │  200 │  28,40   │  31,20   │  6.240  │ ↑ 9% │  │
│   │ SAPR4  │  300 │   4,90   │   5,15   │  1.545  │ ↑ 5% │  │
│   │ KLBN4  │  150 │   3,80   │   3,62   │    543  │ ↓ 4% │  │
│   └────────┴──────┴──────────┴──────────┴─────────┴──────┘  │
│                                                              │
│   FIIs                                        R$ 19.272     │
│   ┌────────┬──────┬──────────┬──────────┬─────────┬──────┐  │
│   │ MXRF11 │  500 │  10,12   │  10,38   │  5.190  │ ↑ 3% │  │
│   │ VGIR11 │  120 │   9,80   │   9,95   │  1.194  │ ↑ 2% │  │
│   │ VGHF11 │  200 │   9,40   │   9,12   │  1.824  │ ↓ 3% │  │
│   └────────┴──────┴──────────┴──────────┴─────────┴──────┘  │
│                                                              │
│   Próximos proventos                                         │
│   • MXRF11   15/11   R$ 0,10/cota  ≈ R$ 50,00              │
│   • BBAS3    22/11   R$ 0,42/cota  ≈ R$ 84,00              │
└─────────────────────────────────────────────────────────────┘
```

A aba **IRPF** dentro de Investimentos mostra: seletor de ano, dois blocos copiáveis (Bens e Direitos / Rendimentos) com botão "copiar texto" por linha, prontos para colar no programa da Receita.

---

## Notas técnicas

- **Realtime cross-device:** subscribe nas tabelas relevantes em hooks (`useTransactions`, `useHoldings`) — qualquer mudança aparece em todos os dispositivos do mesmo usuário em <1s.
- **Cotações:** Edge Function `refresh-quotes` chamada sob demanda + cache 15min; throttle global para respeitar BRAPI.
- **Parcelas:** ao criar `installment_purchase`, gera N `transactions` futuras (uma por mês) marcadas com índice — facilita relatórios e abate limite mês a mês.
- **IRPF:** função SQL roda sobre `holdings_lots` + `dividends` filtrando pelo ano; resultado puramente derivado (nada armazenado redundantemente).
- **Preparação RN:** lógica de cálculo isolada em `src/lib/finance/` (sem React) para reaproveitar no Expo depois.

---

## Próximos passos depois da aprovação

1. Cloud + schema + RLS + seeds de categorias e ativos B3 populares.
2. Auth + shell do app (sidebar, layout, tema Cloud White).
3. Dashboard + Transações + Cartões com parcelas.
4. Despesas Contínuas + A Receber.
5. Investimentos + Dividendos + cotações BRAPI.
6. Assistente IRPF.

Quando quiser, abrimos um plano separado para **fase 2**: Pluggy + app React Native + importação OFX.