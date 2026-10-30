# Persistência local opcional — especificação de design

## Objetivo

Permitir que a pessoa salve manualmente, neste navegador, somente as premissas
anônimas do diagnóstico e as restaure ao reabrir a ferramenta. A persistência é
opt-in, local e apagável. O fluxo sem salvamento continua funcionando apenas em
memória.

## Experiência do usuário

- A seção **Premissas** oferece **Salvar neste navegador**. O botão só fica
  habilitado quando as premissas passam pela validação existente do diagnóstico;
  executar o cálculo não é necessário para salvar.
- Nenhum dado é gravado antes do clique explícito. Alterações posteriores não
  são salvas automaticamente e não substituem o registro anterior enquanto as
  premissas atuais forem inválidas.
- Ao abrir a ferramenta, a aplicação verifica o registro local antes de
  habilitar a edição. Se ele existir e for válido, restaura automaticamente as
  premissas e informa que os dados vieram deste navegador. Sem registro, usa os
  valores iniciais existentes.
- Um JSON malformado ou esquema incompatível não é aplicado nem apagado
  silenciosamente. A aplicação permanece utilizável com dados iniciais e mostra
  um erro, permitindo apagar o registro ou salvar novas premissas válidas.
- Uma mensagem de privacidade informa que os dados permanecem neste navegador,
  não são enviados e não são criptografados pelo produto.
- **Apagar dados salvos** solicita confirmação acessível. Após a remoção local
  bem-sucedida, a aplicação também reinicia o estado em memória: premissas,
  resultados, premissas dos cenários, verificações e checklist. Se a remoção
  falhar, preserva a sessão atual e informa que a exclusão não foi concluída,
  permitindo nova tentativa.

## Dados persistidos

O armazenamento consiste em um único registro JSON versionado, sob uma chave
namespaced pertencente à ferramenta. O formato é:

```ts
type PersistableAssumptions = {
  schemaVersion: 1;
  savedAt: string;
  assumptions: {
    employeeRows: Array<{
      localId: string;
      salaryDecimal: string;
      weeklyHoursDecimal: string;
      contractType: "full-time" | "part-time";
    }>;
    coverage: CoverageAssumption[];
    referenceDate: string;
    legalParameterVersion: string;
  };
};
```

`salaryDecimal` e `weeklyHoursDecimal` preservam as strings decimais válidas
informadas no formulário, sem conversão para ponto flutuante. A lista de
`coverage` usa os valores normalizados pelo parser existente. O identificador
`localId` é anônimo e criado localmente.

Não são persistidos nomes, e-mails, CNPJ, premissas financeiras de cenários,
resultados, checks de conformidade nem checklist da linha do tempo. Resultados
e checks começam pendentes/desconhecidos após restauração; os demais estados não
persistidos voltam aos valores iniciais.

Se `legalParameterVersion` diferir dos parâmetros carregados na aplicação, as
premissas ainda são restauradas, mas a interface avisa que o diagnóstico deve
ser recalculado com a versão atual. Nenhum resultado jurídico antigo é
restaurado.

## Componentes e interfaces

`src/features/local-data/local-data-store.ts` implementa o armazenamento
versionado e valida o JSON lido em tempo de execução. Sua API é:

```ts
type StorageError = {
  code: "unavailable" | "quota" | "invalid-data";
  message: string;
};

saveLocalAssumptions(
  value: PersistableAssumptions,
): Result<void, StorageError>;

loadLocalAssumptions():
  Result<PersistableAssumptions | null, StorageError>;

clearLocalAssumptions(): Result<void, StorageError>;
```

Registro ausente retorna sucesso com `null`. JSON inválido, campos incorretos
ou versão de esquema não suportada retornam `invalid-data`. Falhas de acesso ao
armazenamento retornam `unavailable`; falhas de quota ao salvar retornam
`quota`. Erros são apresentados ao usuário; não há fallback com aparência de
sucesso.

`src/features/local-data/data-controls.tsx` apresenta os controles e mensagens
acessíveis por props e callbacks. A página `/diagnostico` coordena a leitura
inicial, a conversão das premissas validadas para o formato persistível, o save,
a confirmação de exclusão e o reset do estado React. A camada de dados grava
apenas a chave da ferramenta; não limpa `localStorage` globalmente.

## Privacidade e limites

- A leitura/gravação usa somente o armazenamento local do navegador.
- A aplicação não envia dados operacionais por rede e não adiciona sincronização,
  telemetria, analytics ou API.
- A persistência é manual e contém somente os campos listados acima.
- O mecanismo não promete criptografia nem proteção contra outras pessoas com
  acesso ao mesmo perfil do navegador.
- Se armazenamento estiver indisponível, a sessão em memória permanece
  utilizável; a interface nunca afirma que dados foram salvos ou apagados sem
  confirmação do resultado da operação.

## Verificação

Testes unitários devem cobrir save/load/clear, round-trip válido, JSON
malformado, esquema antigo e erros de quota/segurança.

Testes de navegador devem cobrir restauração após reload, ausência de gravação
antes do clique explícito ou por edição automática, exclusão confirmada com
estado ativo limpo e registro ausente após novo reload. Cancelar a confirmação
mantém dados e sessão. Os testes também verificam que entradas e resultados não
aparecem em requisições e que não há upload ou transmissão de dados
operacionais.

Executar os testes unitários de armazenamento, os testes E2E de persistência e
os testes E2E de privacidade existentes.
