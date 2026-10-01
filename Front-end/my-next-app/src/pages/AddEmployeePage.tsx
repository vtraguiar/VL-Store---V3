import { IMaskInput } from "react-imask";
import {
  isValidEmail,
  isValidCpf,
  isValidPhone,
  isValidDateBR,
  isValidPassword,
  PASSWORD_RULE_TEXT,
  extractDigitsOnly,
  focusFirstError,
} from "../utils/validationUtils";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../../public/css/products.css";
import "../../public/css/general.css";

const AddEmployee = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const [employeeData, setEmployeeData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    role: "funcionario", // Valor padrão
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");

    if (!jwtToken || !userData) {
      router.push("/initialPage");
      return;
    }
  }, []);

  const pushBackToEmployees = () => {
    router.push("/employeesPage");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEmployeeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const errors: Record<string, string> = {};
    if (!employeeData.nome.trim())
      errors.nome = "Informe o nome do funcionário.";
    if (!isValidEmail(employeeData.email))
      errors.email = "Informe um e-mail válido.";
    if (!isValidCpf(extractDigitsOnly(employeeData.cpf)))
      errors.cpf = "Informe um CPF válido, incluindo os dígitos verificadores.";
    if (!isValidPhone(extractDigitsOnly(employeeData.telefone)))
      errors.telefone = "Informe o telefone com DDD e 10 ou 11 dígitos.";
    if (
      !isValidDateBR(
        employeeData.data_nascimento.split("-").reverse().join("/"),
      )
    )
      errors.data_nascimento =
        "Informe uma data de nascimento existente e não futura.";
    if (!isValidPassword(password))
      errors.password = "A senha não atende à regra indicada abaixo do campo.";
    if (!confirmPassword || password !== confirmPassword)
      errors.confirmPassword = "As senhas não coincidem.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setLoading(false);
      focusFirstError(errors);
      return;
    }

    const jwtToken = localStorage.getItem("jwtToken");
    const userData = localStorage.getItem("userData");

    if (!jwtToken || !userData) {
      router.push("/initialPage");
      return;
    }

    try {
      const parsedData = JSON.parse(userData);
      const idLoja = parsedData.id_loja;

      const payload = {
        ...employeeData,
        cpf: extractDigitsOnly(employeeData.cpf),
        telefone: extractDigitsOnly(employeeData.telefone),
        senha: password,
        id_loja: idLoja,
      };

      const response = await axios.post(
        "https://vl-store-v2.onrender.com/api/funcionarios",
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
          pushBackToEmployees();
        }, 3000);
      }
    } catch (error) {
      setError(
        axios.isAxiosError(error) && error.response?.status === 409
          ? "Email, CPF ou telefone já cadastrados"
          : "Não foi possível cadastrar o funcionário. Verifique os dados e sua conexão e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmployeeData({
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      data_nascimento: "",
      role: "funcionario",
    });
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100">
      <div className="product-page d-flex justify-content-center align-items-center terciary p-4 flex-column rounded-5 white-light">
        <h3 className="col-12 text-center">Adicionar Novo Funcionário</h3>

        {success && (
          <div
            role="status"
            className="alert alert-success alert-inline col-12 text-center mt-2"
          >
            Funcionário cadastrado com sucesso! Redirecionando...
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
                <h5 className="text-center mb-2">Informações básicas</h5>

                <label className="form-label" htmlFor={"nome"}>
                  Nome completo *
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
                  placeholder="Ex: João da Silva"
                  value={employeeData.nome}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["nome"] && (
                  <div id={"nome-erro"} className="invalid-feedback d-block">
                    {fieldErrors["nome"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"email"}>
                  E-mail *
                </label>
                <input
                  id={"email"}
                  aria-invalid={!!fieldErrors["email"]}
                  aria-describedby={
                    fieldErrors["email"] ? "email-erro" : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["email"] ? " is-invalid" : "")
                  }
                  type="email"
                  name="email"
                  placeholder="Ex: joao@email.com"
                  value={employeeData.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["email"] && (
                  <div id={"email-erro"} className="invalid-feedback d-block">
                    {fieldErrors["email"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"cpf"}>
                  CPF *
                </label>
                <IMaskInput
                  unmask={true}
                  mask="000.000.000-00"
                  id={"cpf"}
                  aria-invalid={!!fieldErrors["cpf"]}
                  aria-describedby={fieldErrors["cpf"] ? "cpf-erro" : undefined}
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["cpf"] ? " is-invalid" : "")
                  }
                  name="cpf"
                  placeholder="Ex: 12345678900"
                  value={employeeData.cpf}
                  onAccept={(value: string) => {
                    setEmployeeData((prev) => ({
                      ...prev,
                      cpf: extractDigitsOnly(value),
                    }));
                    clearFieldError("cpf");
                  }}
                  required
                />
                {fieldErrors["cpf"] && (
                  <div id={"cpf-erro"} className="invalid-feedback d-block">
                    {fieldErrors["cpf"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"telefone"}>
                  Telefone *
                </label>
                <IMaskInput
                  unmask={true}
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
                  placeholder="Ex: 11987654321"
                  value={employeeData.telefone}
                  onAccept={(value: string) => {
                    setEmployeeData((prev) => ({
                      ...prev,
                      telefone: extractDigitsOnly(value),
                    }));
                    clearFieldError("telefone");
                  }}
                  required
                />
                {fieldErrors["telefone"] && (
                  <div
                    id={"telefone-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["telefone"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"data_nascimento"}>
                  Data de nascimento *
                </label>
                <input
                  id={"data_nascimento"}
                  aria-invalid={!!fieldErrors["data_nascimento"]}
                  aria-describedby={
                    fieldErrors["data_nascimento"]
                      ? "data_nascimento-erro"
                      : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["data_nascimento"] ? " is-invalid" : "")
                  }
                  type="date"
                  name="data_nascimento"
                  value={employeeData.data_nascimento}
                  onChange={handleChange}
                  required
                />
                {fieldErrors["data_nascimento"] && (
                  <div
                    id={"data_nascimento-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["data_nascimento"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"password"}>
                  Senha *
                </label>
                <input
                  id={"password"}
                  aria-invalid={!!fieldErrors["password"]}
                  aria-describedby={
                    fieldErrors["password"]
                      ? "password-ajuda password-erro"
                      : "password-ajuda"
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["password"] ? " is-invalid" : "")
                  }
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p id="password-ajuda" className="form-text text-light">
                  {PASSWORD_RULE_TEXT}
                </p>
                {fieldErrors["password"] && (
                  <div
                    id={"password-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["password"]}
                  </div>
                )}

                <label className="form-label" htmlFor={"confirmPassword"}>
                  Confirmar senha *
                </label>
                <input
                  id={"confirmPassword"}
                  aria-invalid={!!fieldErrors["confirmPassword"]}
                  aria-describedby={
                    fieldErrors["confirmPassword"]
                      ? "confirmPassword-erro"
                      : undefined
                  }
                  className={
                    "mb-3 produto-input" +
                    (fieldErrors["confirmPassword"] ? " is-invalid" : "")
                  }
                  type="password"
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {fieldErrors["confirmPassword"] && (
                  <div
                    id={"confirmPassword-erro"}
                    className="invalid-feedback d-block"
                  >
                    {fieldErrors["confirmPassword"]}
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
              onClick={pushBackToEmployees}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="down-btn btn col-12 col-md-3 primaria"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Funcionário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;
