import SearchCombobox from "../SearchCombobox";
import { focusFirstError } from "../../../utils/validationUtils";
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

// Interfaces de dados

interface Funcionario {
  nome: string;
}
interface ProductVariation {
  id_variacao: string;
  produto: { nome: string; referencia: string };
  descricao_variacao: string;
  preco_venda: number;
}

interface CartItem {
  id_variacao: string;
  nome: string;
  referencia: string;
  descricao_variacao: string;
  quantidade: number;
  precoUnitario: number;
}

interface Seller {
  id_funcionario: string;
  nome: string;
  cargo?: string;
  id_loja: string;
}

interface Cashier {
  id_caixa: string;
  nome: string;
  status: "ABERTO" | "FECHADO";
  funcionario_responsavel: Funcionario;
  data_abertura: string;
  hora_abertura: string;
}

interface SalePayload {
  id_funcionario: string;
  forma_pagamento: string;
  id_caixa: string; // Adicionado id_caixa
  itens: { id_variacao: string; quantidade: number; preco_unitario: number }[];
  desconto: number;
  acrescimo: number;
}

// Interface de Props
interface SalesFormProps {
  vendedoresDisponiveis: Seller[];
  produtosDisponiveis: ProductVariation[];
  jwtToken?: string;
  onSaleRegistered: (sale: any) => void;
}

const SalesForm: React.FC<SalesFormProps> = ({
  onSaleRegistered,
  jwtToken,
  vendedoresDisponiveis,
  produtosDisponiveis,
}) => {
  // Hooks de estado
  const [vendedorResponsavelId, setVendedorResponsavelId] =
    useState<string>("");
  const [dataVenda, setDataVenda] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>("");
  const [quantidadeProduto, setQuantidadeProduto] = useState<number>(1);
  const [precoUnitario, setPrecoUnitario] = useState<string>("");
  const [carrinhoVenda, setCarrinhoVenda] = useState<CartItem[]>([]);
  const [descontoVenda, setDescontoVenda] = useState<string>("0.00");
  const [acrescimoVenda, setAcrescimoVenda] = useState<string>("0.00");

  // Novos estados para caixas e loading
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<string>("");
  const [caixasDisponiveis, setCaixasDisponiveis] = useState<Cashier[]>([]);
  const [isLoadingCaixas, setIsLoadingCaixas] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estados para mensagens e pesquisas
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const [success, setSuccess] = useState("");
  const [produtoSearchTerm, setProdutoSearchTerm] = useState<string>("");
  const [vendedorSearchTerm, setVendedorSearchTerm] = useState<string>("");

  // Função para exibir mensagens de feedback
  const showMessage = (message: string, type: "success" | "error") => {
    if (type === "error") {
      setError(message);
      setSuccess("");
    } else {
      setError("");
      setSuccess(message);
      setTimeout(() => setSuccess(""), 5000);
    }
  };

  // Efeito para gerar código da venda e data inicial
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setDataVenda(localDateTime);
  }, []);

  // Efeito para buscar caixas quando um vendedor é selecionado
  useEffect(() => {
    let cancelled = false;
    const fetchCaixasDaLoja = async () => {
      setCaixasDisponiveis([]);
      // Nome da função alterado para clareza
      // Se nenhum vendedor estiver selecionado, limpa os caixas
      if (!vendedorResponsavelId || !jwtToken) {
        setCaixasDisponiveis([]);
        setCaixaSelecionadoId("");
        setIsLoadingCaixas(false);
        return;
      }

      setIsLoadingCaixas(true);
      setCaixaSelecionadoId(""); // 1. Encontrar o objeto completo do vendedor selecionado para obter o id_loja

      const vendedorSelecionado = vendedoresDisponiveis.find(
        (v) => v.id_funcionario === vendedorResponsavelId,
      ); // Se não encontrar o vendedor ou o id_loja, interrompe a execução

      if (!vendedorSelecionado || !vendedorSelecionado.id_loja) {
        showMessage(
          "Dados do vendedor estão incompletos (sem loja associada).",
          "error",
        );
        setIsLoadingCaixas(false);
        return;
      }

      const id_loja = vendedorSelecionado.id_loja;

      try {
        const response = await axios.get(
          `https://vl-store-v2.onrender.com/api/caixas/loja/${id_loja}`,
          { headers: { Authorization: `Bearer ${jwtToken}` } },
        ); // --- MUDANÇA PRINCIPAL AQUI --- // Filtra apenas por caixas com status "ABERTO", independente do funcionário.

        if (cancelled) return;
        const caixasAbertosNaLoja = response.data.data.filter(
          (caixa: any) => caixa.status === "ABERTO",
        );

        // LOG para verificar o resultado do novo filtro
        console.log("CAIXAS ABERTOS NA LOJA (FILTRADOS):", caixasAbertosNaLoja);

        setCaixasDisponiveis(caixasAbertosNaLoja); // Se houver apenas um caixa aberto, seleciona-o automaticamente

        if (caixasAbertosNaLoja.length === 1) {
          setCaixaSelecionadoId(caixasAbertosNaLoja[0].id_caixa);
        } else if (caixasAbertosNaLoja.length === 0) {
          // Mensagem de erro atualizada para refletir a nova lógica
          showMessage(
            "Não há nenhum caixa aberto nesta loja para registrar a venda.",
            "error",
          );
        }
      } catch {
        if (cancelled) return;
        showMessage(
          "Não foi possível carregar os caixas. Verifique sua conexão e selecione o vendedor novamente.",
          "error",
        );
        setCaixasDisponiveis([]);
      } finally {
        if (!cancelled) setIsLoadingCaixas(false);
      }
    };

    fetchCaixasDaLoja();
    return () => {
      cancelled = true;
    }; // O nome da função foi atualizado aqui também
  }, [vendedorResponsavelId, jwtToken, vendedoresDisponiveis]); // As dependências continuam as mesmas

  // ... resto do código do componente ...

  // Efeito para definir preço unitário ao selecionar um produto
  useEffect(() => {
    if (produtoSelecionadoId) {
      const produto = produtosDisponiveis.find(
        (p) => p.id_variacao === produtoSelecionadoId,
      );
      if (produto) {
        setPrecoUnitario(produto.preco_venda.toFixed(2));
      }
    } else {
      setPrecoUnitario("");
    }
  }, [produtoSelecionadoId, produtosDisponiveis]);

  // Cálculo do valor total da venda
  const valorTotalVenda = useMemo(() => {
    const subtotalProdutos = carrinhoVenda.reduce(
      (sum, item) => sum + item.quantidade * item.precoUnitario,
      0,
    );
    const descontoNum = parseFloat(descontoVenda.replace(",", ".")) || 0;
    const acrescimoNum = parseFloat(acrescimoVenda.replace(",", ".")) || 0;
    return subtotalProdutos - descontoNum + acrescimoNum;
  }, [carrinhoVenda, descontoVenda, acrescimoVenda]);

  const subtotalProdutos = carrinhoVenda.reduce(
    (sum, item) => sum + item.quantidade * item.precoUnitario,
    0,
  );
  const descontoNum = Number(descontoVenda.replace(",", "."));
  const acrescimoNum = Number(acrescimoVenda.replace(",", "."));
  const descontoError =
    !Number.isFinite(descontoNum) || descontoNum < 0
      ? "Informe um desconto válido e não negativo."
      : descontoNum > subtotalProdutos
        ? `O desconto não pode ser maior que R$ ${subtotalProdutos.toFixed(2)}`
        : "";
  const acrescimoError =
    !Number.isFinite(acrescimoNum) || acrescimoNum < 0
      ? "Informe um acréscimo válido e não negativo."
      : "";

  // Filtros para pesquisa de produtos e vendedores
  const filteredProducts = useMemo(() => {
    if (!produtoSearchTerm.trim()) return produtosDisponiveis;
    const term = produtoSearchTerm.toLowerCase();
    return produtosDisponiveis.filter(
      (p) =>
        p.produto.nome.toLowerCase().includes(term) ||
        p.descricao_variacao.toLowerCase().includes(term) ||
        p.produto.referencia.toLowerCase().includes(term),
    );
  }, [produtoSearchTerm, produtosDisponiveis]);

  const filteredVendedores = useMemo(() => {
    if (!vendedorSearchTerm.trim()) return vendedoresDisponiveis;
    const term = vendedorSearchTerm.toLowerCase();
    return vendedoresDisponiveis.filter(
      (v) =>
        v.nome.toLowerCase().includes(term) ||
        (v.cargo && v.cargo.toLowerCase().includes(term)),
    );
  }, [vendedorSearchTerm, vendedoresDisponiveis]);

  // Função para adicionar produto ao carrinho
  const handleAdicionarProdutoVenda = () => {
    if (!Number.isInteger(quantidadeProduto) || quantidadeProduto < 1) {
      setFieldErrors((prev) => ({
        ...prev,
        quantidadeProduto: "Informe uma quantidade inteira (mínimo 1).",
      }));
      focusFirstError({ quantidadeProduto: "Informe uma quantidade." });
      return;
    }
    if (!produtoSelecionadoId) {
      setFieldErrors((prev) => ({
        ...prev,
        produtoVenda: "Selecione um produto para adicionar.",
      }));
      focusFirstError({ produtoVenda: "Selecione um produto." });
      return;
    }
    const produto = produtosDisponiveis.find(
      (p) => p.id_variacao === produtoSelecionadoId,
    );
    if (!produto) return;

    const itemExistente = carrinhoVenda.find(
      (item) => item.id_variacao === produtoSelecionadoId,
    );
    if (itemExistente) {
      setCarrinhoVenda(
        carrinhoVenda.map((item) =>
          item.id_variacao === produtoSelecionadoId
            ? { ...item, quantidade: item.quantidade + quantidadeProduto }
            : item,
        ),
      );
    } else {
      const novoItem: CartItem = {
        id_variacao: produto.id_variacao,
        nome: produto.produto.nome,
        referencia: produto.produto.referencia,
        descricao_variacao: produto.descricao_variacao,
        quantidade: quantidadeProduto,
        precoUnitario: produto.preco_venda,
      };
      setCarrinhoVenda([...carrinhoVenda, novoItem]);
    }
    clearFieldError("produtoVenda");
    clearFieldError("quantidadeProduto");
    setProdutoSelecionadoId("");
    setQuantidadeProduto(1);
    setPrecoUnitario("");
    setProdutoSearchTerm("");
  };

  const handleRemoverProdutoDoCarrinho = (idVariacao: string) => {
    setCarrinhoVenda(
      carrinhoVenda.filter((item) => item.id_variacao !== idVariacao),
    );
  };

  const handleNumericInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => {
    const sanitizedValue = value.replace(",", ".");
    if (sanitizedValue.split(".").length > 2) return;
    setter(sanitizedValue);
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setFieldErrors({});
    setVendedorResponsavelId("");
    setVendedorSearchTerm("");
    setFormaPagamento("");
    setCaixaSelecionadoId("");
    setCaixasDisponiveis([]);
    setCarrinhoVenda([]);
    setDescontoVenda("0.00");
    setAcrescimoVenda("0.00");
    setProdutoSelecionadoId("");
    setQuantidadeProduto(1);
    setProdutoSearchTerm("");
  };

  // Função refatorada para submeter a venda
  const handleSubmitVenda = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;
    setError("");
    const errors: Record<string, string> = {};
    if (!vendedorResponsavelId)
      errors.vendedorResponsavel = "Selecione o vendedor responsável.";
    if (!formaPagamento)
      errors.formaPagamento = "Selecione a forma de pagamento.";
    if (!caixaSelecionadoId) errors.caixa = "Selecione um caixa aberto.";
    if (!carrinhoVenda.length)
      errors.produtoVenda = "Adicione ao menos um produto à venda.";
    if (descontoError) errors.descontoVenda = descontoError;
    if (acrescimoError) errors.acrescimoVenda = acrescimoError;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    if (!Number.isFinite(valorTotalVenda) || valorTotalVenda < 0) {
      showMessage("Confira os valores da venda antes de finalizar.", "error");
      return;
    }

    setIsSubmitting(true);

    const salePayload: SalePayload = {
      id_funcionario: vendedorResponsavelId,
      forma_pagamento: formaPagamento,
      id_caixa: caixaSelecionadoId,
      itens: carrinhoVenda.map((item) => ({
        id_variacao: item.id_variacao,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
      })),
      desconto: parseFloat(descontoVenda.replace(",", ".")) || 0,
      acrescimo: parseFloat(acrescimoVenda.replace(",", ".")) || 0,
    };

    try {
      const config = { headers: { Authorization: `Bearer ${jwtToken}` } };

      // --- ETAPA 1: Registrar a Venda ---
      const responseVenda = await axios.post(
        "https://vl-store-v2.onrender.com/api/vendas",
        salePayload,
        config,
      );

      console.log(responseVenda);

      // Extrai os dados da venda criada para usar na próxima etapa
      const vendaCriada = responseVenda.data.data;
      const idVendaCriada = responseVenda.data.data.id_venda;
      const valorTotalVenda = responseVenda.data.data.total; // Supondo que o backend retorna o valor total

      console.log(valorTotalVenda);
      // Validação da resposta da primeira chamada
      if (!idVendaCriada) {
        throw new Error(
          "A resposta do servidor para a criação da venda não contém os dados necessários (ID).",
        );
      }

      // --- ETAPA 2: Registrar a Movimentação no Caixa ---
      const movimentacaoPayload = {
        tipo: "ENTRADA",
        valor: valorTotalVenda,
        descricao: `Venda #${
          vendaCriada.codigo_venda || idVendaCriada.substring(0, 8)
        }`, // Descrição mais informativa
        id_venda: idVendaCriada,
      };

      await axios.post(
        `https://vl-store-v2.onrender.com/api/caixas/${caixaSelecionadoId}/movimentacoes`,
        movimentacaoPayload,
        config,
      );

      // Se ambas as requisições deram certo, mostre o sucesso.
      showMessage(
        "Venda e movimentação de caixa registradas com sucesso!",
        "success",
      );
      onSaleRegistered(vendaCriada);
      resetForm();
    } catch (error) {
      console.error("Erro no processo de registro de venda:", error);

      showMessage(
        "Não foi possível concluir a venda ou a movimentação. Confira os registros antes de tentar novamente.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // JSX do componente
  return (
    <div className="quinary text-white p-4 rounded-5 white-light-small d-flex flex-column w-75 mx-auto h-100">
      {/* Alertas de erro e sucesso */}

      {success && (
        <div role="status" className="alert alert-success alert-inline">
          {success}
        </div>
      )}

      <div className="mb-3">
        <h5 className="mb-0 text-white">
          <i className="fas fa-plus-circle mr-2"></i>Registrar Nova Venda
        </h5>
      </div>

      <div
        className="flex-grow-1"
        style={{ overflowY: "auto", paddingRight: "10px" }}
      >
        <form
          onChangeCapture={(e) =>
            clearFieldError((e.target as HTMLInputElement).id)
          }
          id="sales-form-content"
          onSubmit={handleSubmitVenda}
          noValidate
        >
          <p>* Campo obrigatório</p>
          {/* Linha 1: Vendedor e Data */}
          <div className="row mb-3">
            {/* Vendedor */}
            <div className="col-md-6 position-relative">
              <label
                htmlFor="vendedorResponsavel"
                className="form-label text-white-75 small"
              >
                Vendedor Responsável *
              </label>
              <SearchCombobox
                id="vendedorResponsavel"
                value={vendedorSearchTerm}
                disabled={isSubmitting}
                error={fieldErrors.vendedorResponsavel}
                options={filteredVendedores.map((v) => ({
                  id: v.id_funcionario,
                  label: `${v.nome}${v.cargo ? ` (${v.cargo})` : ""}`,
                }))}
                onChange={(value) => {
                  setVendedorSearchTerm(value);
                  setVendedorResponsavelId("");
                  setCaixaSelecionadoId("");
                  clearFieldError("vendedorResponsavel");
                  clearFieldError("caixa");
                }}
                onSelect={(id, label) => {
                  setVendedorResponsavelId(id);
                  setVendedorSearchTerm(label);
                  clearFieldError("vendedorResponsavel");
                  clearFieldError("caixa");
                }}
              />
            </div>
            {/* Data e Hora */}
            <div className="col-md-6">
              <label
                htmlFor="dataVenda"
                className="form-label text-white-75 small"
              >
                Data e Hora
              </label>
              <input
                type="datetime-local"
                className="form-control input-form"
                id="dataVenda"
                value={dataVenda}
                readOnly
                aria-readonly="true"
                aria-describedby="dataVenda-ajuda"
              />
              <p id="dataVenda-ajuda" className="form-text text-light">
                Registrada automaticamente ao finalizar
              </p>
            </div>
          </div>

          {/* Linha 2: Forma de Pagamento e Caixa */}
          <div className="row mb-4">
            {/* Forma de Pagamento */}
            <div className="col-md-6">
              <label
                htmlFor="formaPagamento"
                className="form-label text-white-75 small"
              >
                Forma de Pagamento *
              </label>
              <select
                id="formaPagamento"
                aria-invalid={!!fieldErrors.formaPagamento}
                aria-describedby={
                  fieldErrors.formaPagamento ? "formaPagamento-erro" : undefined
                }
                className={
                  "form-control p-2 custom-select input-form" +
                  (fieldErrors.formaPagamento ? " is-invalid" : "")
                }
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                required
              >
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value=""
                  disabled
                >
                  Selecione...
                </option>
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value="DINHEIRO"
                >
                  Dinheiro
                </option>
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value="CARTAO_CREDITO"
                >
                  Cartão de Crédito
                </option>
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value="CARTAO_DEBITO"
                >
                  Cartão de Débito
                </option>
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value="PIX"
                >
                  PIX
                </option>
              </select>
              {fieldErrors.formaPagamento && (
                <div
                  id="formaPagamento-erro"
                  className="invalid-feedback d-block"
                >
                  {fieldErrors.formaPagamento}
                </div>
              )}
            </div>
            {/* Caixa */}
            <div className="col-md-6">
              <label htmlFor="caixa" className="form-label text-white-75 small">
                Caixa *
              </label>
              <select
                id="caixa"
                aria-invalid={!!fieldErrors.caixa}
                aria-describedby={fieldErrors.caixa ? "caixa-erro" : undefined}
                className={
                  "form-control p-2  custom-select input-form" +
                  (fieldErrors.caixa ? " is-invalid" : "")
                }
                value={caixaSelecionadoId}
                onChange={(e) => setCaixaSelecionadoId(e.target.value)}
                disabled={caixasDisponiveis.length === 0}
                required
              >
                <option
                  className="list-group position-absolute w-100 mt-1 z-index-dropdown bg-dark border rounded"
                  value=""
                  disabled
                >
                  {!vendedorResponsavelId
                    ? "Selecione o vendedor primeiro"
                    : isLoadingCaixas
                      ? "Carregando caixas..."
                      : caixasDisponiveis.length === 0
                        ? "Nenhum caixa aberto nesta loja"
                        : "Selecione um caixa aberto..."}
                </option>
                {caixasDisponiveis.map((caixa) => (
                  <option key={caixa.id_caixa} value={caixa.id_caixa}>
                    {"Caixa de: " +
                      caixa.funcionario_responsavel.nome +
                      ". Abertura: Data: " +
                      caixa.data_abertura +
                      " | Hora: " +
                      caixa.hora_abertura}
                  </option>
                ))}
              </select>
              {fieldErrors.caixa && (
                <div id="caixa-erro" className="invalid-feedback d-block">
                  {fieldErrors.caixa}
                </div>
              )}
              {!isLoadingCaixas &&
                vendedorResponsavelId &&
                caixasDisponiveis.length === 0 && (
                  <div className="text-danger small mt-1">
                    Nenhum caixa aberto nesta loja.
                  </div>
                )}
            </div>
          </div>

          {/* Seção de Produtos */}
          <h6 className="mb-3 text-white">
            <i className="fas fa-shopping-basket mr-2"></i>Produtos da Venda
          </h6>
          {/* ... restante do JSX para adicionar e listar produtos ... */}
          {/* Adicionar Produto */}
          <div className="row g-2 align-items-baseline mb-3">
            {/* Campo de busca de produto */}
            <div className="col-md-5 position-relative">
              <label
                htmlFor="produtoVenda"
                className="form-label text-white-75 small mb-1"
              >
                Produto *
              </label>
              <SearchCombobox
                id="produtoVenda"
                value={produtoSearchTerm}
                disabled={isSubmitting}
                error={fieldErrors.produtoVenda}
                options={filteredProducts.map((p) => ({
                  id: p.id_variacao,
                  label: `${p.produto.nome} (REF: ${p.produto.referencia}) - ${p.descricao_variacao}`,
                }))}
                onChange={(value) => {
                  setProdutoSearchTerm(value);
                  setProdutoSelecionadoId("");
                  clearFieldError("produtoVenda");
                }}
                onSelect={(id, label) => {
                  setProdutoSelecionadoId(id);
                  setProdutoSearchTerm(label);
                  clearFieldError("produtoVenda");
                }}
              />
            </div>
            {/* Quantidade */}
            <div className="col-md-2">
              <label
                htmlFor="quantidadeProduto"
                className="form-label text-white-75 small mb-1"
              >
                Qtd. *
              </label>
              <input
                type="number"
                className={
                  "form-control input-form" +
                  (fieldErrors.quantidadeProduto ? " is-invalid" : "")
                }
                id="quantidadeProduto"
                aria-invalid={!!fieldErrors.quantidadeProduto}
                aria-describedby={
                  fieldErrors.quantidadeProduto
                    ? "quantidadeProduto-erro"
                    : undefined
                }
                value={quantidadeProduto}
                onChange={(e) => setQuantidadeProduto(Number(e.target.value))}
                min="1"
              />
              {fieldErrors.quantidadeProduto && (
                <div
                  id="quantidadeProduto-erro"
                  className="invalid-feedback d-block"
                >
                  {fieldErrors.quantidadeProduto}
                </div>
              )}
            </div>
            {/* Preço Unitário */}
            <div className="col-md-2">
              <label
                htmlFor="precoUnitario"
                className="form-label text-white-75 small mb-1"
              >
                Preço Un.
              </label>
              <input
                type="text"
                className="form-control input-form"
                id="precoUnitario"
                value={precoUnitario ? `R$ ${precoUnitario}` : ""}
                readOnly
              />
            </div>
            {/* Botão Adicionar */}
            <div className="col-md-3 d-flex align-items-end">
              <button
                type="button"
                className="btn primaria w-100"
                onClick={handleAdicionarProdutoVenda}
              >
                <i className="fas fa-plus"></i> Adicionar
              </button>
            </div>
          </div>
          {/* Tabela de Produtos do Carrinho */}
          <div
            className="mb-4 table-responsive quartenary p-2 rounded-lg"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            <table className="table table-sm table-borderless text-white">
              <thead>
                <tr className="fine-transparent-border">
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço Un.</th>
                  <th>Subtotal</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {carrinhoVenda.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-3 text-white-75">
                      Nenhum produto adicionado.
                    </td>
                  </tr>
                ) : (
                  carrinhoVenda.map((item) => (
                    <tr
                      key={item.id_variacao}
                      className="fine-transparent-border"
                    >
                      <td>
                        {item.nome} <small>({item.descricao_variacao})</small>
                      </td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.precoUnitario.toFixed(2)}</td>
                      <td>
                        R$ {(item.quantidade * item.precoUnitario).toFixed(2)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-delete"
                          onClick={() =>
                            handleRemoverProdutoDoCarrinho(item.id_variacao)
                          }
                          title="Remover"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Desconto e Acréscimo */}
          <div className="row mb-4">
            <div className="col-md-6">
              <label
                htmlFor="descontoVenda"
                className="form-label text-white-75 small"
              >
                Desconto (R$)
              </label>
              <input
                type="text"
                className={
                  "form-control input-form" +
                  (descontoError ? " is-invalid" : "")
                }
                id="descontoVenda"
                aria-invalid={!!descontoError}
                aria-describedby={
                  descontoError ? "descontoVenda-erro" : undefined
                }
                placeholder="0.00"
                value={descontoVenda}
                onChange={(e) =>
                  handleNumericInputChange(setDescontoVenda, e.target.value)
                }
              />
              {descontoError && (
                <div
                  id="descontoVenda-erro"
                  className="invalid-feedback d-block"
                >
                  {descontoError}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label
                htmlFor="acrescimoVenda"
                className="form-label text-white-75 small"
              >
                Acréscimo (R$)
              </label>
              <input
                type="text"
                className={
                  "form-control input-form" +
                  (acrescimoError ? " is-invalid" : "")
                }
                id="acrescimoVenda"
                aria-invalid={!!acrescimoError}
                aria-describedby={
                  acrescimoError ? "acrescimoVenda-erro" : undefined
                }
                placeholder="0.00"
                value={acrescimoVenda}
                onChange={(e) =>
                  handleNumericInputChange(setAcrescimoVenda, e.target.value)
                }
              />
              {acrescimoError && (
                <div
                  id="acrescimoVenda-erro"
                  className="invalid-feedback d-block"
                >
                  {acrescimoError}
                </div>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="alert alert-danger alert-inline">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Rodapé com Total e Botão Finalizar */}
      <div
        className="mt-auto pt-3 d-flex justify-content-between align-items-center border-top"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div>
          <h4 className="text-white mb-0">
            Total:{" "}
            <span
              className="font-weight-bold"
              style={{ color: valorTotalVenda < 0 ? "#fca5a5" : "#86efac" }}
            >
              R$ {valorTotalVenda.toFixed(2)}
            </span>
          </h4>
        </div>
        <button
          type="submit"
          form="sales-form-content"
          className="btn primaria px-4 py-2"
          disabled={
            isSubmitting ||
            isLoadingCaixas ||
            !caixaSelecionadoId ||
            carrinhoVenda.length === 0 ||
            valorTotalVenda < 0 ||
            !Number.isFinite(valorTotalVenda) ||
            !!descontoError ||
            !!acrescimoError ||
            Object.keys(fieldErrors).length > 0
          }
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span className="ms-2">Registrando...</span>
            </>
          ) : (
            <>
              <i className="fas fa-check-circle mr-2"></i>
              Finalizar Venda
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SalesForm;
