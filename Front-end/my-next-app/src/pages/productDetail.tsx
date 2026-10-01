import { focusFirstError } from "../utils/validationUtils";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../../public/css/products.css";
import "../../public/css/general.css";

interface Variation {
  id_variacao?: string;
  descricao_variacao: string;
  quant_variacao: number;
  valor: number | string;
}

const ProductDetail = () => {
  const router = useRouter();
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [productData, setProductData] = useState({
    referencia: "",
    nome: "",
    categoria: "",
    material: "",
    genero: "",
    id_loja: "",
  });

  const [variations, setVariations] = useState<Variation[]>([
    { descricao_variacao: "", quant_variacao: 0, valor: 0 },
  ]);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const [originalProduct, setOriginalProduct] = useState<
    typeof productData | null
  >(null);
  const [originalVariations, setOriginalVariations] = useState<Variation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaveRequested, setLeaveRequested] = useState(false);
  const hasChanges =
    !!originalProduct &&
    (JSON.stringify(productData) !== JSON.stringify(originalProduct) ||
      JSON.stringify(variations) !== JSON.stringify(originalVariations));

  useEffect(() => {
    const produto = localStorage.getItem("selectedProduct");
    if (produto) {
      const produtoObj = JSON.parse(produto);
      const data = produtoObj.data;

      const product = {
        referencia: data.referencia || "",
        nome: data.nome || "",
        categoria: data.categoria || "",
        material: data.material || "",
        genero: data.genero || "",
        id_loja: data.id_loja,
      };
      const loadedVariations: Variation[] = (data.variacoes || []).map(
        (v: Variation) => ({
          id_variacao: v.id_variacao,
          descricao_variacao: v.descricao_variacao || "",
          quant_variacao: Number(v.quant_variacao) || 0,
          valor: Number(v.valor) || 0,
        }),
      );
      setProductData(product);
      setOriginalProduct(product);
      setVariations(loadedVariations);
      setOriginalVariations(loadedVariations);
    }
  }, []);

  useEffect(() => {
    const jwtToken = localStorage.getItem("jwtToken");
    const userDataStr = localStorage.getItem("userData");

    if (!jwtToken || !userDataStr) {
      router.push("/initialPage");
      return;
    }

    const userData = JSON.parse(userDataStr);
    if (userData.role == "funcionario") {
      setIsViewOnly(true);
    }
  }, []);

  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem("jwtToken");
    return {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleVariationChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setVariations((prev) =>
      prev.map((v, i) =>
        i === index
          ? {
              ...v,
              [name]:
                name === "descricao_variacao"
                  ? value
                  : name === "valor"
                    ? value
                    : Number(value),
            }
          : v,
      ),
    );
    setSuccess(false);
  };
  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      { descricao_variacao: "", quant_variacao: 0, valor: 0 },
    ]);
    setSuccess(false);
  };
  const removeVariation = (index: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((previous) =>
      Object.fromEntries(
        Object.entries(previous).flatMap(([key, message]) => {
          const match = key.match(/^variacao-(\d+)-(.+)$/);
          if (!match) return [[key, message]];
          const row = Number(match[1]);
          if (row === index) return [];
          return [
            [`variacao-${row > index ? row - 1 : row}-${match[2]}`, message],
          ];
        }),
      ),
    );
    setSuccess(false);
  };
  const cancelChanges = () => {
    if (originalProduct) setProductData({ ...originalProduct });
    setVariations(originalVariations.map((v) => ({ ...v })));
    setError("");
    setFieldErrors({});
    setSuccess(false);
    setLeaveRequested(false);
  };

  const saveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly || isSaving || !originalProduct || !hasChanges) return;
    setError("");
    setSuccess(false);
    const errors: Record<string, string> = {};
    for (const [key, label] of Object.entries({
      nome: "nome",
      categoria: "categoria",
      material: "material",
    })) {
      if (!productData[key as keyof typeof productData].trim())
        errors[key] = `Informe ${label} do produto.`;
    }
    const pending = variations.map((v) => ({
      ...v,
      valor: Number(String(v.valor).replace(",", ".")),
    }));
    pending.forEach((v, index) => {
      if (!v.descricao_variacao.trim())
        errors[`variacao-${index}-descricao`] =
          "Informe a descrição da variação.";
      // Estoque existente pode estar esgotado; novas variações começam com pelo menos uma unidade.
      const minimum = v.id_variacao ? 0 : 1;
      if (!Number.isInteger(v.quant_variacao) || v.quant_variacao < minimum)
        errors[`variacao-${index}-quantidade`] =
          `Informe a quantidade inteira (mínimo ${minimum}).`;
      if (!Number.isFinite(v.valor) || v.valor < 0.01)
        errors[`variacao-${index}-valor`] = "Informe o valor (mínimo R$ 0,01).";
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    setIsSaving(true);
    let savedProduct = { ...originalProduct };
    let savedVariations = originalVariations.map((v) => ({ ...v }));
    let stage = "os dados do produto";
    const persistSnapshot = () => {
      setOriginalProduct({ ...savedProduct });
      setOriginalVariations(savedVariations.map((v) => ({ ...v })));
      localStorage.setItem(
        "selectedProduct",
        JSON.stringify({
          data: { ...savedProduct, variacoes: savedVariations },
        }),
      );
    };
    try {
      const patch: Record<string, string> = {};
      for (const key of ["nome", "categoria", "material", "genero"] as const) {
        if (productData[key] !== originalProduct[key])
          patch[key] = productData[key];
      }
      if (Object.keys(patch).length) {
        await axios.patch(
          `https://vl-store-v2.onrender.com/api/produtos/loja/${productData.id_loja}/referencia/${productData.referencia}`,
          patch,
          { headers: getAuthHeaders() },
        );
        savedProduct = { ...productData };
        persistSnapshot();
      }
      // Primeiro atualizar as existentes, depois criar, por fim remover.
      for (const v of pending.filter((v) => v.id_variacao)) {
        const original = savedVariations.find(
          (item) => item.id_variacao === v.id_variacao,
        );
        const patch: Record<string, string | number> = {};
        for (const key of [
          "descricao_variacao",
          "quant_variacao",
          "valor",
        ] as const) {
          if (v[key] !== original?.[key]) patch[key] = v[key];
        }
        if (!Object.keys(patch).length) continue;
        stage = `a variação “${v.descricao_variacao}”`;
        await axios.patch(
          `https://vl-store-v2.onrender.com/api/produtos/variacoes/${v.id_variacao}`,
          patch,
          { headers: getAuthHeaders() },
        );
        savedVariations = savedVariations.map((item) =>
          item.id_variacao === v.id_variacao ? { ...v } : item,
        );
        persistSnapshot();
      }
      for (const v of pending.filter((v) => !v.id_variacao)) {
        stage = `a nova variação “${v.descricao_variacao}”`;
        const response = await axios.post(
          `https://vl-store-v2.onrender.com/api/produtos/referencia/${productData.referencia}/loja/${productData.id_loja}/variacoes`,
          {
            descricao_variacao: v.descricao_variacao,
            quant_variacao: v.quant_variacao,
            valor: v.valor,
          },
          { headers: getAuthHeaders() },
        );
        v.id_variacao = response.data.data.id_variacao;
        savedVariations.push({ ...v });
        setVariations(pending.map((item) => ({ ...item })));
        persistSnapshot();
      }
      for (const v of savedVariations.filter(
        (v) => !pending.some((item) => item.id_variacao === v.id_variacao),
      )) {
        stage = `a remoção da variação “${v.descricao_variacao}”`;
        await axios.delete(
          `https://vl-store-v2.onrender.com/api/produtos/variacoes/${v.id_variacao}`,
          { headers: getAuthHeaders() },
        );
        savedVariations = savedVariations.filter(
          (item) => item.id_variacao !== v.id_variacao,
        );
        persistSnapshot();
      }
      savedVariations = pending.map((v) => ({ ...v }));
      persistSnapshot();
      setVariations(pending);
      setSuccess(true);
      if (leaveRequested) router.push("/productsPage");
    } catch {
      setError(
        `Não foi possível salvar ${stage}. As etapas já concluídas foram mantidas; tente salvar novamente para concluir as alterações pendentes.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async () => {
    try {
      await axios.delete(
        `https://vl-store-v2.onrender.com/api/produtos/loja/${productData.id_loja}/referencia/${productData.referencia}`,
        { headers: getAuthHeaders() },
      );
      router.push("/productsPage");
    } catch (err) {
      console.error("Erro ao deletar produto:", err);
      setError("Erro ao deletar produto");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100">
      <div className="product-page d-flex justify-content-center align-items-center terciary p-4 flex-column rounded-5 white-light">
        <h3 className="col-12 text-center">Editar Produto</h3>

        <form
          noValidate
          onChangeCapture={(e) =>
            clearFieldError((e.target as HTMLInputElement).id)
          }
          onSubmit={saveChanges}
          className="row w-100 justify-content-between"
        >
          <p>* Campo obrigatório</p>
          <div className="col-12 w-100">
            <div className="row product-info w-100 d-flex justify-content-between align-items-between">
              <div className="mx-auto col-12 p-4 info-base row">
                <h5 className="text-center mb-2">Informações gerais</h5>

                <label className="form-label" htmlFor={"referencia"}>
                  Referência
                </label>
                <input
                  id={"referencia"}
                  aria-invalid={!!fieldErrors["referencia"]}
                  aria-describedby={
                    fieldErrors["referencia"] ? "referencia-erro" : undefined
                  }
                  className={
                    "mb-3 form-control-plaintext bg-transparent border-0" +
                    (fieldErrors["referencia"] ? " is-invalid" : "")
                  }
                  name="referencia"
                  placeholder="Ex: REF0008"
                  value={productData.referencia}
                  readOnly
                  aria-readonly="true"
                  style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                />
                {fieldErrors["referencia"] && (
                  <div
                    id={"referencia-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["referencia"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"nome"}>
                  Nome do produto *
                </label>
                <input
                  id={"nome"}
                  aria-invalid={!!fieldErrors["nome"]}
                  aria-describedby={
                    fieldErrors["nome"] ? "nome-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["nome"] ? " is-invalid" : "")
                  }
                  name="nome"
                  placeholder="Ex: Camiseta Polo Levi's"
                  value={productData.nome}
                  onChange={handleChange}
                  required
                  disabled={isViewOnly || isSaving}
                />
                {fieldErrors["nome"] && (
                  <div id={"nome-erro"} className="invalid-feedback d-block">
                    {fieldErrors["nome"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"categoria"}>
                  Categoria *
                </label>
                <input
                  id={"categoria"}
                  aria-invalid={!!fieldErrors["categoria"]}
                  aria-describedby={
                    fieldErrors["categoria"] ? "categoria-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["categoria"] ? " is-invalid" : "")
                  }
                  name="categoria"
                  placeholder="Ex: Roupas"
                  value={productData.categoria}
                  onChange={handleChange}
                  required
                  disabled={isViewOnly || isSaving}
                />
                {fieldErrors["categoria"] && (
                  <div
                    id={"categoria-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["categoria"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"material"}>
                  Material *
                </label>
                <input
                  id={"material"}
                  aria-invalid={!!fieldErrors["material"]}
                  aria-describedby={
                    fieldErrors["material"] ? "material-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["material"] ? " is-invalid" : "")
                  }
                  name="material"
                  placeholder="Ex: Algodão"
                  value={productData.material}
                  onChange={handleChange}
                  required
                  disabled={isViewOnly || isSaving}
                />
                {fieldErrors["material"] && (
                  <div
                    id={"material-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["material"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"genero"}>
                  Gênero
                </label>
                <input
                  id={"genero"}
                  aria-invalid={!!fieldErrors["genero"]}
                  aria-describedby={
                    fieldErrors["genero"] ? "genero-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["genero"] ? " is-invalid" : "")
                  }
                  name="genero"
                  placeholder="Ex: Masculino"
                  value={productData.genero}
                  onChange={handleChange}
                  disabled={isViewOnly || isSaving}
                />
                {fieldErrors["genero"] && (
                  <div id={"genero-erro"} className="invalid-feedback d-block">
                    {fieldErrors["genero"]}
                  </div>
                )}
              </div>

              <div className="col-12 w-100">
                <h5 className="text-center mb-4">Variações:</h5>

                {variations.map((variation, index) => (
                  <article
                    key={index}
                    className="p-1 mx-auto variacao row align-items-center pb-4 justify-content-evenly mb-2 w-100"
                  >
                    <div className="col-12 col-md-6">
                      <label
                        className="form-label"
                        htmlFor={`variacao-${index}-descricao`}
                      >
                        Descrição *
                      </label>
                      <input
                        id={`variacao-${index}-descricao`}
                        aria-invalid={
                          !!fieldErrors[`variacao-${index}-descricao`]
                        }
                        aria-describedby={
                          fieldErrors[`variacao-${index}-descricao`]
                            ? `variacao-${index}-descricao-erro`
                            : undefined
                        }
                        type="text"
                        className={
                          "col-12 produto-input" +
                          (fieldErrors[`variacao-${index}-descricao`]
                            ? " is-invalid"
                            : "")
                        }
                        placeholder="Ex: Tamanho GG - Azul"
                        name="descricao_variacao"
                        value={variation.descricao_variacao}
                        onChange={(e) => handleVariationChange(index, e)}
                        disabled={isViewOnly || isSaving}
                      />
                      {fieldErrors[`variacao-${index}-descricao`] && (
                        <div
                          id={`variacao-${index}-descricao-erro`}
                          className="invalid-feedback d-block"
                        >
                          {fieldErrors[`variacao-${index}-descricao`]}
                        </div>
                      )}
                    </div>

                    <div className="col-6 col-md-2">
                      <label
                        className="form-label"
                        htmlFor={`variacao-${index}-quantidade`}
                      >
                        Quantidade *
                      </label>
                      <input
                        id={`variacao-${index}-quantidade`}
                        aria-invalid={
                          !!fieldErrors[`variacao-${index}-quantidade`]
                        }
                        aria-describedby={
                          fieldErrors[`variacao-${index}-quantidade`]
                            ? `variacao-${index}-quantidade-erro`
                            : undefined
                        }
                        type="number"
                        className={
                          "col-12 produto-input" +
                          (fieldErrors[`variacao-${index}-quantidade`]
                            ? " is-invalid"
                            : "")
                        }
                        placeholder="Ex: 10"
                        name="quant_variacao"
                        value={variation.quant_variacao || ""}
                        onChange={(e) => handleVariationChange(index, e)}
                        min="0"
                        disabled={isViewOnly || isSaving}
                      />
                      {fieldErrors[`variacao-${index}-quantidade`] && (
                        <div
                          id={`variacao-${index}-quantidade-erro`}
                          className="invalid-feedback d-block"
                        >
                          {fieldErrors[`variacao-${index}-quantidade`]}
                        </div>
                      )}
                    </div>

                    <div className="col-6 col-md-2">
                      <label
                        className="form-label"
                        htmlFor={`variacao-${index}-valor`}
                      >
                        Valor (R$) *
                      </label>
                      <input
                        id={`variacao-${index}-valor`}
                        aria-invalid={!!fieldErrors[`variacao-${index}-valor`]}
                        aria-describedby={
                          fieldErrors[`variacao-${index}-valor`]
                            ? `variacao-${index}-valor-erro`
                            : undefined
                        }
                        type="text"
                        className={
                          "col-12 produto-input" +
                          (fieldErrors[`variacao-${index}-valor`]
                            ? " is-invalid"
                            : "")
                        }
                        placeholder="Ex: 79.90"
                        name="valor"
                        value={variation.valor || ""}
                        onChange={(e) => handleVariationChange(index, e)}
                        disabled={isViewOnly || isSaving}
                      />
                      {fieldErrors[`variacao-${index}-valor`] && (
                        <div
                          id={`variacao-${index}-valor-erro`}
                          className="invalid-feedback d-block"
                        >
                          {fieldErrors[`variacao-${index}-valor`]}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="col-12 col-md-1 mt-4 btn-delete rounded-5"
                      aria-label={`Remover variação ${index + 1}`}
                      onClick={() => removeVariation(index)}
                      disabled={
                        variations.length <= 1 || isViewOnly || isSaving
                      }
                    >
                      X
                    </button>
                  </article>
                ))}

                <button
                  type="button"
                  className="down-btn btn col-12 col-md-3 primaria"
                  onClick={addVariation}
                  disabled={isViewOnly || isSaving}
                >
                  Adicionar Variação
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="alert alert-danger alert-inline col-12 text-center mt-2"
            >
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success alert-inline" role="status">
              Alterações salvas.
            </div>
          )}
          {!isViewOnly && (
            <>
              {leaveRequested && (
                <div className="alert alert-warning alert-inline" role="alert">
                  Há alterações não salvas.{" "}
                  <button
                    type="submit"
                    className="btn btn-sm btn-outline-dark ms-2"
                    disabled={isSaving}
                  >
                    Salvar
                  </button>{" "}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark ms-2"
                    disabled={isSaving}
                    onClick={() => router.push("/productsPage")}
                  >
                    Descartar
                  </button>
                </div>
              )}
              <button
                type="submit"
                className="btn primaria"
                disabled={!hasChanges || isSaving}
              >
                Salvar alterações
              </button>
              <button
                type="button"
                className="btn primaria"
                disabled={!hasChanges || isSaving}
                onClick={cancelChanges}
              >
                Cancelar alterações
              </button>
            </>
          )}
          <div className="d-flex justify-content-between w-100 mt-3">
            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={() =>
                hasChanges
                  ? setLeaveRequested(true)
                  : router.push("/productsPage")
              }
              disabled={isSaving}
            >
              Voltar
            </button>

            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={deleteProduct}
              disabled={isViewOnly || isSaving}
            >
              Deletar Produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductDetail;
