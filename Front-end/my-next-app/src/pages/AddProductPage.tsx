import { focusFirstError } from "../utils/validationUtils";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../../public/css/products.css";
import "../../public/css/general.css";

const AddProduct = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [productData, setProductData] = useState({
    referencia: "",
    nome: "",
    categoria: "",
    material: "",
    genero: "",
  });

  const [variations, setVariations] = useState([
    { descricao_variacao: "", quant_variacao: 0, valor: 0 },
  ]);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  useEffect(() => {
    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");

    if (!jwtToken || !userData) {
      router.push("/initialPage");
      return;
    }
  }, []);

  const pushBackToProducts = () => {
    router.push("/productsPage");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariationChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    const updatedVariations = [...variations];
    updatedVariations[index] = {
      ...updatedVariations[index],
      [name]:
        name === "quant_variacao" || name === "valor" ? Number(value) : value,
    };
    setVariations(updatedVariations);
  };

  const addVariation = () => {
    setVariations([
      ...variations,
      { descricao_variacao: "", quant_variacao: 0, valor: 0 },
    ]);
  };

  const removeVariation = (index: number) => {
    if (variations.length <= 1) return;
    const updatedVariations = [...variations];
    updatedVariations.splice(index, 1);
    setVariations(updatedVariations);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");

    const errors: Record<string, string> = {};
    for (const [key, label] of Object.entries({
      referencia: "referência",
      nome: "nome",
      categoria: "categoria",
      material: "material",
    })) {
      if (!productData[key as keyof typeof productData].trim())
        errors[key] = `Informe ${label} do produto.`;
    }
    variations.forEach((v, index) => {
      if (!v.descricao_variacao.trim())
        errors[`variacao-${index}-descricao`] =
          "Informe a descrição da variação.";
      if (!Number.isInteger(v.quant_variacao) || v.quant_variacao < 1)
        errors[`variacao-${index}-quantidade`] =
          "Informe a quantidade inteira (mínimo 1).";
      if (!Number.isFinite(v.valor) || v.valor < 0.01)
        errors[`variacao-${index}-valor`] = "Informe o valor (mínimo R$ 0,01).";
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setLoading(false);
      focusFirstError(errors);
      return;
    }

    if (!jwtToken || !userData) {
      router.push("/initialPage");
      return;
    }

    try {
      const parsedData = JSON.parse(userData);
      const idLoja = parsedData.id_loja;

      const payload = {
        ...productData,
        id_loja: idLoja,
        variacoes: variations.map((variation) => ({
          ...variation,
          valor: Number(variation.valor),
        })),
      };

      const response = await axios.post(
        "https://vl-store-v2.onrender.com/api/produtos",
        payload,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        },
      );

      if (response.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          pushBackToProducts();
        }, 3000);
      }
    } catch (error) {
      setError(
        axios.isAxiosError(error) && error.response?.status === 409
          ? "Referência já cadastrada nesta loja."
          : "Não foi possível adicionar o produto. Verifique os dados e sua conexão e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFieldErrors({});
    setProductData({
      referencia: "",
      nome: "",
      categoria: "",
      material: "",
      genero: "",
    });
    setVariations([{ descricao_variacao: "", quant_variacao: 0, valor: 0 }]);
    setError("");
    setSuccess(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100">
      <div className="product-page d-flex justify-content-center align-items-center terciary p-4 flex-column rounded-5 white-light">
        <h3 className="col-12 text-center">Adicionar Novo Produto</h3>

        {success && (
          <div
            role="status"
            className="alert alert-success alert-inline col-12 text-center mt-2"
          >
            Produto cadastrado com sucesso! Redirecionando...
          </div>
        )}

        <form
          noValidate
          onChangeCapture={(e) =>
            clearFieldError((e.target as HTMLInputElement).id)
          }
          onSubmit={handleSubmit}
          className="row w-100 justify-content-between"
        >
          <p>* Campo obrigatório</p>
          <div className="col-12 w-100">
            <div className="row product-info w-100 d-flex justify-content-between align-items-between">
              <div className="mx-auto col-12 p-4 info-base row">
                <h5 className="text-center mb-2">Informações gerais</h5>

                <label className="form-label" htmlFor={"referencia"}>
                  Referência *
                </label>
                <input
                  id={"referencia"}
                  aria-invalid={!!fieldErrors["referencia"]}
                  aria-describedby={
                    fieldErrors["referencia"] ? "referencia-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["referencia"] ? " is-invalid" : "")
                  }
                  name="referencia"
                  placeholder="Ex: REF0008"
                  value={productData.referencia}
                  onChange={handleChange}
                  required
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
                />
                {fieldErrors["genero"] && (
                  <div id={"genero-erro"} className="invalid-feedback d-block">
                    {fieldErrors["genero"]}
                  </div>
                )}
              </div>

              <div className="col-12 w-100">
                <h5 className="text-center mb-4">Variações*:</h5>

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
                        required
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
                        required
                        min="1"
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
                        type="number"
                        className={
                          "col-12 produto-input" +
                          (fieldErrors[`variacao-${index}-valor`]
                            ? " is-invalid"
                            : "")
                        }
                        placeholder="Ex: 79.90"
                        name="valor"
                        step="0.01"
                        value={variation.valor || ""}
                        onChange={(e) => handleVariationChange(index, e)}
                        required
                        min="0.01"
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
                      disabled={variations.length <= 1}
                    >
                      X
                    </button>
                  </article>
                ))}

                <button
                  type="button"
                  className="down-btn btn col-12 col-md-3 primaria"
                  onClick={addVariation}
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
          <div className="d-flex justify-content-between w-100 mt-3">
            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={clearForm}
            >
              Limpar
            </button>

            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={pushBackToProducts}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="down-btn btn col-12 col-md-3 primaria"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
