import { IMaskInput } from "react-imask";
import {
  isValidEmail,
  isValidCpfCnpj,
  isValidPhone,
  extractDigitsOnly,
  focusFirstError,
} from "../utils/validationUtils";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../../public/css/products.css";
import "../../public/css/general.css";

interface StoreData {
  nome: string;
  senha: string;
  email: string;
  cpf_cnpj_proprietario_loja: string;
  data_nasc_proprietario: string;
  telefone: string;
  id_loja: string;
}

const AccountPage = () => {
  const router = useRouter();

  const [storeData, setStoreData] = useState<StoreData>({
    nome: "",
    senha: "",
    email: "",
    cpf_cnpj_proprietario_loja: "",
    data_nasc_proprietario: "",
    telefone: "",
    id_loja: "",
  });

  const [originalData, setOriginalData] = useState<StoreData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const [success, setSuccess] = useState(false);
  const [leaveRequested, setLeaveRequested] = useState(false);

  useEffect(() => {
    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");
    if (!jwtToken || !userData) router.push("/initialPage");
  }, []);

  const getAuthHeaders = () => {
    const jwtToken = localStorage.getItem("jwtToken");
    return {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    };
  };

  const getStore = async () => {
    try {
      const jwtToken = localStorage.getItem("jwtToken");
      const userData = localStorage.getItem("userData");

      if (!jwtToken || !userData) {
        console.error("Usuário não autenticado.");
        return;
      }

      const { id_loja } = JSON.parse(userData);

      const response = await axios.get(
        `https://vl-store-v2.onrender.com/api/lojas/${id_loja}`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          timeout: 2000,
        },
      );

      localStorage.setItem("selectedStore", JSON.stringify(response.data));
      return response.data;
    } catch {
      setError(
        "Não foi possível carregar a loja. Verifique sua conexão e tente novamente.",
      );
    }
  };

  useEffect(() => {
    const loadStoreData = async () => {
      const storeResponse = await getStore();

      if (storeResponse && storeResponse.data) {
        const data = storeResponse.data;
        const parsed = {
          nome: data.nome || "",
          senha: data.senha || "",
          email: data.email || "",
          cpf_cnpj_proprietario_loja: extractDigitsOnly(
            data.cpf_cnpj_proprietario_loja || "",
          ),
          data_nasc_proprietario: data.data_nasc_proprietario || "",
          telefone: extractDigitsOnly(data.telefone || ""),
          id_loja: data.id_loja || "",
        };
        setStoreData(parsed);
        setOriginalData(parsed);
      } else {
        const cachedStore = localStorage.getItem("selectedStore");
        if (cachedStore) {
          try {
            const parsedCachedStore = JSON.parse(cachedStore);
            if (parsedCachedStore.data) {
              const data = parsedCachedStore.data;
              const parsed = {
                nome: data.nome || "",
                senha: data.senha || "",
                email: data.email || "",
                cpf_cnpj_proprietario_loja: extractDigitsOnly(
                  data.cpf_cnpj_proprietario_loja || "",
                ),
                data_nasc_proprietario: data.data_nasc_proprietario || "",
                telefone: extractDigitsOnly(data.telefone || ""),
                id_loja: data.id_loja || "",
              };
              setStoreData(parsed);
              setOriginalData(parsed);
            }
          } catch (parseError) {
            console.error(
              "Erro ao parsear dados da loja do localStorage:",
              parseError,
            );
            setError("Erro ao carregar dados armazenados da loja.");
          }
        }
      }
    };

    loadStoreData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStoreData((prev) => ({ ...prev, [name]: value }));
  };

  const hasStoreDataChanged = () => {
    if (!originalData) return false;
    return JSON.stringify(originalData) !== JSON.stringify(storeData);
  };

  const saveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalData || isSaving || !hasStoreDataChanged()) return;
    setError("");
    setSuccess(false);
    const errors: Record<string, string> = {};
    if (!storeData.nome.trim()) errors.nome = "Informe o nome da loja.";
    if (!isValidEmail(storeData.email))
      errors.email = "Informe um e-mail válido.";
    if (!isValidCpfCnpj(storeData.cpf_cnpj_proprietario_loja))
      errors.cpf_cnpj_proprietario_loja =
        "Informe um CPF/CNPJ válido, incluindo os dígitos verificadores.";
    if (!isValidPhone(extractDigitsOnly(storeData.telefone)))
      errors.telefone = "Informe o telefone com DDD e 10 ou 11 dígitos.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    const payload: Record<string, string> = {};
    for (const key of [
      "nome",
      "email",
      "cpf_cnpj_proprietario_loja",
      "telefone",
    ] as const) {
      if (storeData[key] !== originalData[key])
        payload[key] =
          key === "telefone" || key === "cpf_cnpj_proprietario_loja"
            ? extractDigitsOnly(storeData[key])
            : storeData[key];
    }
    setIsSaving(true);
    try {
      await axios.patch(
        `https://vl-store-v2.onrender.com/api/lojas/${storeData.id_loja}`,
        payload,
        { headers: getAuthHeaders() },
      );
      localStorage.setItem("userData", JSON.stringify(storeData));
      localStorage.setItem(
        "selectedStore",
        JSON.stringify({ data: storeData }),
      );
      setOriginalData({ ...storeData });
      setSuccess(true);
      if (leaveRequested) router.push("/menuPage");
    } catch {
      setError(
        "Não foi possível salvar a loja. Verifique os dados e sua conexão e tente novamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    if (hasStoreDataChanged()) setLeaveRequested(true);
    else router.push("/menuPage");
  };

  const cancelChanges = () => {
    if (originalData) setStoreData({ ...originalData });
    setFieldErrors({});
    setError("");
    setSuccess(false);
    setLeaveRequested(false);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const deleteStore = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(
        `https://vl-store-v2.onrender.com/api/lojas/${storeData.id_loja}`,
        { headers: getAuthHeaders() },
      );
      // Limpa o localStorage ao deletar a conta
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("selectedStore");

      router.push("/initialPage"); // redireciona para a página inicial
    } catch (err) {
      console.error("Erro ao deletar loja:", err);
      setError("Erro ao deletar loja");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100">
      <div className="product-page d-flex justify-content-center align-items-center terciary p-4 flex-column rounded-5 white-light">
        <h3 className="col-12 text-center">Editar Loja</h3>

        {isSaving && (
          <div
            role="status"
            className="alert alert-info alert-inline col-12 text-center mt-2"
          >
            Salvando dados...
          </div>
        )}
        {isDeleting && (
          <div
            role="status"
            className="alert alert-info alert-inline col-12 text-center mt-2"
          >
            Deletando conta...
          </div>
        )}

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

                <label className="form-label" htmlFor={"nome"}>
                  Nome da loja *
                </label>
                <input
                  disabled={isSaving || isDeleting}
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
                  placeholder="Nome"
                  value={storeData.nome}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["nome"] && (
                  <div id={"nome-erro"} className="invalid-feedback d-block">
                    {fieldErrors["nome"]}
                  </div>
                )}

                <label
                  className="form-label"
                  htmlFor={"cpf_cnpj_proprietario_loja"}
                >
                  CPF/CNPJ *
                </label>
                <IMaskInput
                  unmask={true}
                  disabled={isSaving || isDeleting}
                  mask={[
                    { mask: "000.000.000-00" },
                    { mask: "00.000.000/0000-00" },
                  ]}
                  id={"cpf_cnpj_proprietario_loja"}
                  aria-invalid={!!fieldErrors["cpf_cnpj_proprietario_loja"]}
                  aria-describedby={
                    fieldErrors["cpf_cnpj_proprietario_loja"]
                      ? "cpf_cnpj_proprietario_loja-erro"
                      : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["cpf_cnpj_proprietario_loja"]
                      ? " is-invalid"
                      : "")
                  }
                  name="cpf_cnpj_proprietario_loja"
                  placeholder="Digite o CPF ou CNPJ"
                  value={storeData.cpf_cnpj_proprietario_loja}
                  onAccept={(value: string) => {
                    setStoreData((prev) => ({
                      ...prev,
                      cpf_cnpj_proprietario_loja: extractDigitsOnly(value),
                    }));
                    clearFieldError("cpf_cnpj_proprietario_loja");
                  }}
                  required
                />
                {fieldErrors["cpf_cnpj_proprietario_loja"] && (
                  <div
                    id={"cpf_cnpj_proprietario_loja-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["cpf_cnpj_proprietario_loja"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"email"}>
                  E-mail *
                </label>
                <input
                  disabled={isSaving || isDeleting}
                  id={"email"}
                  aria-invalid={!!fieldErrors["email"]}
                  aria-describedby={
                    fieldErrors["email"] ? "email-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["email"] ? " is-invalid" : "")
                  }
                  name="email"
                  placeholder="Digite o email"
                  value={storeData.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["email"] && (
                  <div id={"email-erro"} className="invalid-feedback d-block">
                    {fieldErrors["email"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"telefone"}>
                  Telefone *
                </label>
                <IMaskInput
                  unmask={true}
                  disabled={isSaving || isDeleting}
                  mask={[
                    { mask: "(00) 0000-0000" },
                    { mask: "(00) 00000-0000" },
                  ]}
                  id={"telefone"}
                  aria-invalid={!!fieldErrors["telefone"]}
                  aria-describedby={
                    fieldErrors["telefone"] ? "telefone-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["telefone"] ? " is-invalid" : "")
                  }
                  name="telefone"
                  placeholder="Ex: (99) 99999-9999"
                  value={storeData.telefone}
                  onAccept={(value: string) => {
                    setStoreData((prev) => ({
                      ...prev,
                      telefone: extractDigitsOnly(value),
                    }));
                    clearFieldError("telefone");
                  }}
                />
                {fieldErrors["telefone"] && (
                  <div
                    id={"telefone-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["telefone"]}
                  </div>
                )}
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
                onClick={() => router.push("/menuPage")}
              >
                Descartar
              </button>
            </div>
          )}
          <button
            type="submit"
            className="btn primaria"
            disabled={!hasStoreDataChanged() || isSaving}
          >
            Salvar alterações
          </button>
          <button
            type="button"
            className="btn primaria"
            disabled={!hasStoreDataChanged() || isSaving}
            onClick={cancelChanges}
          >
            Cancelar alterações
          </button>
          <div className="d-flex justify-content-between w-100 mt-3">
            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              onClick={handleBackClick}
              disabled={isSaving}
            >
              Voltar
            </button>

            <button
              type="button"
              className="down-btn btn col-12 col-md-3 primaria"
              disabled={isSaving || isDeleting}
              onClick={deleteStore}
            >
              Deletar Loja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountPage;
