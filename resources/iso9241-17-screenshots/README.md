# Pendências ISO 9241-17 (diálogos de preenchimento de formulário) — VL Store

Levantamento de 2026-09-30 (commit `1a04bfb`), feito por leitura do código e confirmado com a aplicação rodando localmente.
Aqui ficam **apenas** os problemas da parte 17. Achados de outras normas (confirmação de exclusão → 9241-110), bugs de back-end e questões de segurança ficaram de fora.
Os caminhos são relativos a `Front-end/my-next-app/src/`. Os números de linha valem para o commit acima.
Caixas amarelas "[Anotação da análise]" nas imagens foram inseridas só para registrar o que o DevTools mostrou; não fazem parte da interface.

## P1 — Rótulos de campo

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| R1 | Login e Cadastro usam só placeholder como rótulo; o campo preenchido deixa de dizer o que é | `pages/loginPage.tsx:128,142`; `pages/RegisterPage.tsx:159-238` | 02, 04 | Adicionar `<label>` visível acima de cada campo |
| R2 | `<label>` sem ligação com o campo (sem `htmlFor`/`id`) | AddEmployeePage, AddProductPage, productDetail, employeesDetail, accountPage; na venda, `htmlFor="vendedorResponsavel"` e `"produtoVenda"` apontam para inputs sem `id` | árvore de acessibilidade: os campos ficam nomeados pelo placeholder | Dar `id` a cada input e `htmlFor` a cada label |
| R3 | Data de nascimento sem nome acessível | `pages/AddEmployeePage.tsx:211` | a árvore de acessibilidade mostra `textbox` sem nome | Mesma correção de R2 |

## P2 — Campos obrigatórios

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| O1 | "Gênero" sem `*`, mas a validação o exige | `pages/AddProductPage.tsx:223` vs `:87` | 07, 08 | Pôr `*` ou tornar o campo opcional na validação |
| O2 | Telefone com `*` no cadastro de funcionário e sem `*` na edição | `pages/AddEmployeePage.tsx:200` vs `pages/employeesDetail.tsx:185` | 21 | Usar a mesma regra nas duas telas |
| O3 | Na loja, só o CPF/CNPJ tem `*`; o Email é `required` sem `*`; na edição de produto não há nenhum `*` | `pages/accountPage.tsx:221-251`; `pages/productDetail.tsx:256-300` | 23 | Marcar todos os obrigatórios e explicar o `*` uma vez no formulário |

## P3 — Formato e validação da entrada

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| V1 | Data impossível aceita (31/02/2000) | `utils/validationUtils.ts:20` (`convertToISODate`) | 04 | Validar se a data existe; ou usar `type="date"`, como em AddEmployee |
| V2 | CPF e telefone de funcionário aceitam letras, sem máscara | `pages/AddEmployeePage.tsx:191,201` | 11 | Reusar as máscaras `IMaskInput` do Cadastro |
| V3 | CPF/CNPJ só valida o número de dígitos, sem dígito verificador | `utils/validationUtils.ts:6` | — | Validar o dígito verificador |
| V4 | CPF sem máscara na edição da loja, diferente do cadastro | `pages/accountPage.tsx:232` | 23 | Usar a mesma máscara |
| V5 | Desconto sem limite: total negativo com "Finalizar" habilitado | `ui/components/sales/salesFormComponent.tsx` (`valorTotalVenda`, `handleNumericInputChange`) | 17, 19 | Limitar desconto ≤ subtotal e bloquear o envio com total < 0, com erro no campo |
| V6 | Quantidade/valor com `min="0"`, mas a validação exige `> 0` | `pages/AddProductPage.tsx:264,279` vs `:89` | — | Usar `min="1"` na quantidade e `min="0.01"` no valor |
| V7 | Regras de senha diferentes: a da loja é forte, a do funcionário exige só 8 caracteres | `utils/validationUtils.ts:11` vs `pages/AddEmployeePage.tsx:74` | 13 | Usar `isValidPassword` nos dois lugares e mostrar a regra junto ao campo |

## P4 — Feedback de erro

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| E1 | Erro único no topo, fora do formulário, cobrindo o título e o 1º campo | loginPage, RegisterPage, AddProductPage, AddEmployeePage | 05, 06, 08 | Mensagem junto ao campo com erro (`aria-invalid` + `aria-describedby`) e um resumo que não cubra campos |
| E2 | Mensagens genéricas que não dizem qual campo corrigir ("Preencha todos os campos obrigatórios corretamente", "Dados inválidos") | `pages/AddProductPage.tsx:92`; resposta do back-end em AddEmployee | 08, 12 | Validar campo a campo e nomear o campo e o motivo |
| E3 | O erro some sozinho em 3–5 s | `setTimeout(() => setError(""), 3000)` em AddEmployee, AddProduct, productDetail, employeesDetail, accountPage; 5 s no salesForm | 09 | Remover o timeout; limpar o erro quando o usuário corrigir o campo |
| E4 | Mensagem técnica exibida ao usuário | `pages/loginPage.tsx:81` (`Erro na requisição: ${err.message}`) | — | Usar texto orientado ao usuário |

## P5 — Controle do envio

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| C1 | A edição grava a cada tecla (`PATCH` no `onChange`), sem botão Salvar nem desfazer | `pages/productDetail.tsx:85`; `pages/employeesDetail.tsx` (`handleChange`) | 10, 21 | Guardar em estado local e adicionar Salvar/Cancelar |
| C2 | A loja grava só ao clicar em "Voltar", sem botão Salvar | `pages/accountPage.tsx` (`handleBackClick`) | 23 | Botão Salvar explícito; "Voltar" só volta |
| C3 | "Data e Hora" da venda é editável, mas não vai no payload: a data digitada é ignorada | `ui/components/sales/salesFormComponent.tsx` (`SalePayload`) | 19 | Enviar a data ou tornar o campo `readOnly` |

## P6 — Navegação pelo teclado

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| N1 | O ícone de mostrar senha é um `<span onClick>`, fora da ordem do Tab | `pages/loginPage.tsx:151` | 03 | Trocar por `<button type="button" aria-label="Mostrar senha">` |
| N2 | As listas de busca de vendedor e produto não respondem a ↓/Enter e cobrem o botão Salvar | `ui/components/cashier/openNewCashierComponent.tsx:88-131`; `ui/components/sales/salesFormComponent.tsx` (dropdowns) | 14 | Usar `<datalist>`/`<select>` ou o padrão combobox com setas; posicionar a lista sem cobrir ações |

## P7 — Mensagens e valores padrão dos campos

| ID | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| M1 | O campo Caixa diz "Abra um caixa para adicionar uma venda" mesmo com caixa aberto, quando só falta escolher o vendedor | `ui/components/sales/salesFormComponent.tsx` (option do `<select id="caixa">`) | 16 | Texto: "Selecione o vendedor primeiro" |
| M2 | O `role` padrão muda de `"funcionario"` para `"FUNCIONARIO"` depois de "Limpar" | `pages/AddEmployeePage.tsx:19` vs `:135` | — | Usar o mesmo valor |
| M3 | Referência `readOnly` com a mesma aparência dos campos editáveis | `pages/productDetail.tsx:256` | 10 | Estilo visual distinto para campos somente leitura |

## Ordem sugerida
C1 → E3 → E1/E2 → R1/R2 → V5/C3 → O1–O3 → V1–V7 → N1/N2 → M1–M3.
