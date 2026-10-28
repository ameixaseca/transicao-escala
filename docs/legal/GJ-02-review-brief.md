# Roteiro de revisão jurídica — GJ-02

## Objetivo e limite

Solicitar a advogado(a) trabalhista uma análise escrita das interpretações e regras abaixo antes de implementar os cálculos correspondentes ou disponibilizar o produto. Este roteiro organiza perguntas; não responde a elas, não é parecer jurídico e não substitui a análise profissional do texto integral e da legislação aplicável.

## Material de referência

- Emenda Constitucional nº 141, publicada em 16/10/2026, DOU, Edição 196-A, Seção 1 - Extra A, página 2: [ato no DOU](https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165).
- [Versão certificada da página 2](https://pesquisa.in.gov.br/imprensa/jsp/visualiza/index.jsp?data=16/10/2026&jornal=600&pagina=2).
- O art. 6º prevê 42 horas semanais dois meses após a publicação e 40 horas semanais um ano após o prazo do inciso I.
- O art. 10, I, dispõe que a alteração do art. 7º, XV, promovida pelo art. 1º entra em vigor após dois meses da publicação; o art. 10, II, dispõe que os demais dispositivos entram em vigor na data da publicação.
- A data de publicação usada para as perguntas é 16/10/2026. As datas 16/12/2026 e 16/12/2027 são apenas resultados de cálculo de calendário a partir da redação citada, ainda sujeitos à análise profissional.
- A minuta do Senado é material histórico e não deve prevalecer sobre o texto publicado.

## Respostas profissionais recebidas em 28/10/2026

O usuário informou que as respostas e resoluções anexadas foram recebidas e validadas pelo profissional responsável. A cópia não inclui nome, OAB, assinatura ou parecer formal; afirma que algumas normas precisam ser conferidas em fontes oficiais, reconhece risco residual no divisor e deixa escolhas conservadoras de produto para aceitação expressa. Os itens abaixo são, portanto, posições profissionais reportadas pelo usuário, não parecer independente deste documento.

### Decisões reportadas

- **Arts. 6º e 10 / datas:** aplicar a leitura transitória do art. 6º: 44 h e um repouso até 15/12/2026; 42 h e dois repousos a partir de 16/12/2026; 40 h e dois repousos a partir de 16/12/2027. Rejeitar 15/12. Fim de semana/feriado não desloca a vigência.
- **Semana de transição:** a política de produto proposta é adotar a regra nova na semana civil inteira que contém o marco (14–20/12/2026 e 13–19/12/2027) e exibir aviso. É uma escolha conservadora de produto, não antecipação do marco jurídico.
- **42 h em cinco dias / GJ-03:** 8h24 por dia depende de CCT/ACT; acordo individual não basta para essa ampliação específica. Sem norma coletiva aplicável, 40 h são normais e as horas 41/42 são extras. Acordo individual de compensação pode redistribuir jornada já de até 40 h para quem trabalhava seis dias. Para teleatendimento, aumento da jornada diária depende de instrumento coletivo, sujeito às regras próprias da NR-17.
- **Divisor / salário:** posição reportada: divisores 220/210/200 para 44/42/40 h, respectivamente; segundo repouso não altera o divisor. O risco residual sobre a aplicação do 210 depois da EC deve ser divulgado e acompanhado. Em dezembro de 2026, aplicar 220 até 15/12 e 210 a partir de 16/12; como simplificação mais benéfica ao trabalhador, pode-se oferecer 210 desde 01/12. Proteger remuneração de horistas, diaristas e pisos; calcular DSR de horistas, comissionistas e trabalho em domicílio para dois repousos; considerar horas extras habituais no DSR. O sábado deixa de ser dia útil para a fórmula reportada de reflexos no regime 5x2.
- **Repousos e janelas:** dois repousos na semana, não necessariamente consecutivos, mais janela móvel que impeça mais de seis dias consecutivos trabalhados. Cada repouso deve compor 35 h contínuas com 11 h interjornada; descansos consecutivos, 59 h.
- **Domingos/feriados:** aplicar ao comércio um domingo de repouso a cada três semanas; para empregadas, regra quinzenal do art. 386, salvo CCT com regra própria indicada pelo usuário; para outras atividades autorizadas, um domingo a cada sete semanas conforme Portaria MTP 671/2021, art. 58, § 2º. Comércio em feriado exige CCT e lei municipal, ressalvadas atividades do Anexo IV da Portaria MTE 1.316/2026, conforme resposta recebida. A conferência das fontes oficiais fica registrada como ressalva após o fechamento do GJ-02.
- **Média de repousos / 12x36:** a exceção de média mensal requer CCT/ACT; a proposta conservadora é mínimo `ceil(2 × dias do mês ÷ 7)` repousos no mês-calendário e pelo menos um em cada janela de sete dias. A regra de arredondamento é uma escolha conservadora ainda sujeita a aceitação formal do advogado. A jornada 12x36 pode ser pactuada individualmente por escrito ou por instrumento coletivo, segundo a posição reportada e a ADI 5994. Média semanal: horas efetivas por plantão × 3,5; 12 h efetivas geram média de 42 h; 11 h de trabalho mais 1 h de intervalo geram 38,5 h. Aplicar hora noturna reduzida. Bloquear ou limitar cálculo conforme teto vigente e dados efetivos do plantão.
- **Intervalos:** aplicar art. 71 pela jornada efetiva: até 4 h, sem intervalo; acima de 4 h até 6 h, 15 min; acima de 6 h, 1 h, admitidas as exceções indicadas para CCT/ACT e 12x36. Validar o intervalo exigido e o concedido. A estimativa de supressão parcial usa o período suprimido com adicional de 50%, explicitamente identificada como estimativa. Bloquear categorias especiais não modeladas.
- **Arts. 2º, 4º, 5º, 8º e 9º:** a resposta reporta garantia remuneratória desde 16/10/2026; contratos já em até 40 h sem redução, com novos repousos na primeira etapa; medidas do art. 5º dependentes de lei complementar; requisitos cumulativos para art. 8º e exceção de duração/controle, preservados repousos e § 2º; cronograma próprio para contratos públicos do art. 9º. Como o alcance dos repousos do art. 9º é controverso, bloquear esses contratos no MVP. Limite do art. 8º deve ser parâmetro anual versionado, nunca valor fixo.
- **Custos:** salário-hora e custo total do empregador são conceitos separados. A resposta considera FGTS e provisões legais como componentes calculáveis e INSS patronal, RAT/FAP e terceiros como entradas contábeis por regime. Horas extras usam parcelas salariais e adicional mínimo de 50%; domingo/feriado sem compensação, dobra; reflexo habitual no DSR usa horas extras ÷ dias trabalhados × repousos/feriados.

### Ressalvas mantidas para rastreabilidade após o fechamento

1. A cópia recebida não traz nome/OAB, assinatura nem data própria do responsável; arquivar esses dados se forem disponibilizados.
2. A resposta recomendou conferência palavra por palavra da EC nº 141 na versão certificada do DOU e anexação de fontes oficiais para CLT, Leis 605/1949 e 10.101/2000, Portarias MTE 1.316/2026 e MTP 671/2021, jurisprudência do TST e decisão do STF citadas.
3. As escolhas conservadoras de produto registradas são: aplicar a regra nova à semana inteira do marco, arredondar para cima a média mensal de repousos e bloquear contratos públicos no MVP.
4. Manter documentado o risco residual da interpretação do divisor 210 em versão de parâmetros e na documentação do produto.

### Registro de fechamento

**GJ-02 fechado por decisão expressa do usuário em 28/10/2026.** A decisão considera suficientes, para o escopo do gate, as respostas profissionais reportadas e registradas acima. As ressalvas de evidência e formalização são preservadas para rastreabilidade e não reabrem GJ-02. O fechamento não significa que este documento verificou independentemente as fontes, nem que a cópia apresentada continha assinatura ou OAB. O GJ-04 continua exigindo a revisão pré-lançamento e bloqueia o lançamento até sua conclusão.

## Questionário original (referência histórica; respostas atualizadas acima)

As perguntas abaixo registram o escopo do pedido inicial de revisão. As resoluções profissionais recebidas posteriormente estão resumidas nas seções anteriores e substituem as perguntas correspondentes; as ressalvas documentais e interpretativas preservadas após o fechamento estão enumeradas em “Ressalvas mantidas para rastreabilidade após o fechamento”.

### 1. Vigência e cronograma — arts. 6º e 10 (RN-01 a RN-03)

1. Como o art. 10, I e II, se aplica em conjunto com as etapas do art. 6º? Identifique quais alterações constitucionais produzem efeitos na publicação e quais somente após o prazo de dois meses.
2. Qual é a data juridicamente correta de início de cada etapa, considerando publicação em 16/10/2026? Confirme ou corrija, com fundamento, as datas aritméticas de 16/12/2026 e 16/12/2027.
3. Como devem ser contados os prazos (“dois meses” e “um ano após o decurso do prazo”)? Indique regra de contagem, termo inicial/final e tratamento de eventual fim de semana ou feriado, se aplicável.
4. Quais regras de jornada e repouso podem ser aplicadas em cada marco, e quais ficam suspensas pela vigência diferenciada?
5. A redação de 40 horas do art. 7º, XIII, tem efeito imediato ou sua aplicação é escalonada pelo art. 6º? Confirme expressamente a relação entre os dois dispositivos e o art. 10.
6. Para a etapa de 42 horas, como se compatibilizam o limite diário normal e a distribuição em cinco dias? A ampliação prevista no art. 7º exige instrumento coletivo, ou existe outra forma válida de compensação? Diferencie a resposta desta pergunta da questão de GJ-03 sobre disponibilidade e horas extras.
7. Como tratar a semana que atravessa o marco de vigência e os dias imediatamente anteriores à mudança? O cálculo deve ser diário, semanal ou por ciclo, e que aviso o produto deve exibir?

### 2. Repouso semanal, domingos e comércio — RN-03 e RN-04

1. Qual número e duração de repousos semanais são exigidos antes e após cada marco de vigência? O texto publicado exige dois dias completos por semana, ou há condição/transição a observar?
2. Qual é o alcance de “preferencialmente aos domingos” no texto constitucional? Isso cria obrigação, preferência ou regra sujeita a exceções? Quais são as consequências práticas para uma escala?
3. Como a EC nº 141 se articula com o art. 6º da Lei nº 10.101/2000 para o trabalho no comércio, inclusive a frequência mínima de repouso coincidente com domingo? A regra de “ao menos 1 domingo a cada 3 semanas” do PRD está correta para o público e os contratos contemplados? Identifique exceções e diferenças por categoria, inclusive a possível aplicação do art. 386 da CLT.
4. Qual regra de repouso dominical se aplica às demais atividades autorizadas a funcionar aos domingos? Identifique a norma e sua versão vigente.
5. O trabalho em feriado no comércio exige norma coletiva e autorização adicional? Qual é a situação vigente da Portaria MTE 3.665/2023 e que regra o produto deve aplicar?
6. A regra de repouso deve ser aplicada por semana civil, ciclo de escala ou período móvel? A jurisprudência sobre repouso após o sétimo dia consecutivo implica uma janela móvel? Especifique janela, número/duração dos repousos e casos de borda.
7. Cada repouso precisa ser de 24 horas consecutivas? Como se relaciona com o intervalo interjornada de 11 horas, especialmente quando os repousos semanais são separados? A exigência de 35 horas contínuas se aplica a cada repouso ou a um deles?

### 3. Regra especial 12x36 e atividades essenciais — RN-07

1. A EC nº 141 cria exceção para “atividades essenciais” ou a hipótese é limitada a regimes diferenciados estabelecidos em lei ou norma regulamentadora? A expressão “atividade essencial” deve ser removida do PRD?
2. Quais dispositivos da EC nº 141 se aplicam a jornadas 12x36 e a outros regimes diferenciados? Indique requisitos, exceções e eventual necessidade de acordo individual escrito ou negociação coletiva.
3. A validação do repouso pode usar média mensal em vez de exigir o mínimo em cada semana? Se sim, confirme o texto aplicável, fórmula, período de apuração e trava mínima semanal. A média pode ser prevista por acordo individual ou somente por instrumento coletivo?
4. A regra especial é aplicável a todas as atividades essenciais ou somente às categorias/hipóteses definidas em lei ou norma regulamentadora? Como o produto deve reconhecer uma hipótese válida sem solicitar dados excessivos?
5. Um acordo individual escrito de 12x36 permanece suficiente após a EC nº 141? Uma norma coletiva é necessária para o repouso médio dos §§ 2º e 3º?
6. O regime 12x36 é compatível com o teto semanal de 40 horas da etapa final? Que tratamento deve ser aplicado até resolver a questão?

### 4. Intervalos intrajornada — RN-10

1. Confirme a aplicação do art. 71 da CLT aos contratos e jornadas abrangidos pelo produto: faixas de duração diária, duração mínima/máxima do intervalo e situações em que instrumento coletivo pode alterar o intervalo.
2. Como deve ser tratado o intervalo em jornadas exatamente de 4 horas, exatamente de 6 horas, acima de 6 horas, em tempo parcial e em 12x36?
3. A validação deve considerar duração contratada ou duração efetiva, incluindo extrapolação habitual? A validação deve verificar intervalo concedido, intervalo mínimo ou ambos?
4. Em caso de intervalo parcialmente suprimido, qual consequência jurídica deve ser informada? O produto deve apenas sinalizar a violação ou pode estimar pagamento/indenização, e com qual fórmula?
5. Identifique categorias com disciplina especial de intervalo que devem ficar fora do escopo ou ser bloqueadas.

### 5. Divisor mensal e custo-hora — RN-06

1. Confirme se o divisor mensal aplicável a salário mensalista deve ser calculado como jornada semanal × 5 para 44, 42 e 40 horas (220, 210 e 200), ou indique a fórmula correta e sua base normativa. A jurisprudência anterior à EC continua aplicável após a mudança dos repousos? Confirme especificamente o divisor intermediário de 210.
2. A fórmula muda para jornada parcial, escala 12x36, repousos adicionais, feriados, categorias com regras próprias ou regimes de compensação?
3. Como o art. 2º da EC nº 141 protege salário nominal, proporcional, pisos e remuneração de horistas quando a jornada diminui? Confirme a fórmula para reajustar valor-hora e indique situações que exigem outro tratamento.
4. Para hora extra, qual base de cálculo, divisor e adicional mínimo devem ser aplicados em cada situação? Diferencie regra legal geral de premissas que dependam de convenção/acordo coletivo.
5. Como calcular trabalho em domingo/feriado sem folga compensatória e reflexo de horas extras habituais no repouso semanal remunerado? Defina a fórmula e o que conta como dias úteis/repousos em jornada 5x2.
6. O produto deve distinguir salário-hora de custo total do empregador? Quais componentes podem ser calculados com segurança a partir das entradas previstas e quais dependem de regime tributário, contabilidade ou premissas do empregador?
7. Quais entradas mínimas o usuário deve fornecer e em quais casos o cálculo deve ser bloqueado? Confirme o tratamento para norma coletiva desconhecida, 12x36, turnos ininterruptos, menores, empregados do art. 8º, contratos públicos e categorias com jornada especial.

### 6. Regras transitórias e grupos especiais — arts. 2º, 4º, 5º, 8º e 9º

1. Confirme o alcance imediato da garantia remuneratória do art. 2º, inclusive salários proporcionais, horistas e pisos salariais.
2. Como o art. 4º trata contratos com jornada já igual ou inferior a 40 horas? A redução de horas é vedada, mas os novos repousos se aplicam? Em que data?
3. O art. 5º depende de lei complementar futura para produzir medidas de mitigação a MEI/ME/EPP? Há algum efeito direto que o produto deve representar antes dessa lei?
4. Quais regras de jornada e repouso se aplicam aos empregados abrangidos pelo art. 8º? Que critérios cumulativos definem o grupo e que limitações/exceções permanecem?
5. Como funciona o cronograma do art. 9º para empregados alocados em contratos públicos vigentes, inclusive aditamento e prazo máximo de um ano? O MVP deve bloquear esses casos ou modelar uma vigência própria?
6. Identifique as fontes oficiais e a data de vigência para cada resposta; não basear as regras de produção apenas em fontes secundárias.

## Resultado solicitado ao(à) advogado(a)

Para cada pergunta ou conjunto de perguntas, registrar:

- conclusão objetiva: aprovada, rejeitada ou depende de informação adicional;
- fundamento legal, dispositivo e fonte oficial consultada;
- população, categorias, contratos, instrumentos coletivos e situações abrangidos;
- vigência e data a partir da qual a regra deve ser aplicada;
- exceções e dados necessários para identificá-las;
- texto operacional recomendado para o PRD e regras de cálculo aprovadas;
- casos de teste concretos, incluindo limites de datas, jornada e exceções;
- pendências que impeçam implementar ou publicar o cálculo;
- nome, qualificação profissional, data e identificação/assinatura do responsável pela revisão.

Uma resposta genérica de que “o PRD está correto” não encerra o gate: solicite decisão explícita para cada tópico acima. Não alterar parâmetros para `aprovado`, nem liberar cálculos ou lançamento, até registrar as conclusões e fechar os gates aplicáveis.

## Registro da revisão

| Tópico | Conclusão reportada | Fundamento/fonte | Regra e testes registrados | Ressalvas/evidências para acompanhamento | Revisor(a) / data |
| --- | --- | --- | --- | --- | --- |
| Arts. 6º e 10 / vigência | Posição reportada: marcos em 16/12/2026 e 16/12/2027; rejeitada a data 15/12 | EC nº 141; anexar conferência da versão certificada | 44/42/40 h; política conservadora para semana de transição | Formalizar autoria/assinatura e aceitação da política semanal | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |
| Repouso semanal / domingos / comércio | Posições reportadas: dois repousos, janela móvel, 35/59 h, periodicidades dominicais e regras de feriado | EC, Lei 10.101/2000, CLT, TST e Portarias; anexar fontes oficiais | Regras descritas no registro de decisões acima | Conferir normas e formalizar a aplicação do art. 386 e da Portaria 1.316/2026 | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |
| Regimes compensatórios / 12x36 | Posição reportada: média mensal exige CCT/ACT; 12x36 pode ser individual por escrito | EC nº 141, §§ 2º e 3º; CLT art. 59-A; ADI 5994; fontes oficiais a anexar | Média mensal arredondada para cima como regra conservadora; compatibilidade pelo cálculo das horas efetivas | Aceitação formal do arredondamento; manter bloqueio cautelar de contratos públicos no MVP | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |
| Intervalos (CLT art. 71) | Faixas e duração efetiva reportadas | CLT, Súmulas TST e regras especiais; fontes oficiais a anexar | Regras descritas no registro de decisões acima | Conferência de fontes, escopo das categorias especiais e assinatura | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |
| Divisor e custo-hora | Posição reportada: 220/210/200; segundo repouso não altera divisor | CLT, CF, Súmulas TST e Tema 260; fontes oficiais a anexar | Tratamento de dezembro misto e reflexos de DSR descritos acima | Documentar o risco residual do divisor 210; premissas contábeis de encargos fora do gate | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |
| Regras transitórias e grupos especiais (arts. 2º, 4º, 5º, 8º e 9º) | Posições reportadas; contratos públicos bloqueados no MVP devido à divergência sobre repousos | EC nº 141; conferir palavra por palavra no DOU certificado | Demais alcances descritos no registro de decisões acima | Anexar fontes oficiais e formalizar a regra cautelar para contratos públicos | Respostas reportadas pelo usuário em 28/10/2026; cópia sem identificação/assinatura |

**Status após as resoluções reportadas em 28/10/2026:** GJ-02 está fechado por decisão expressa do usuário, conforme registro acima. As posições materiais orientam o PRD; a autoria/assinatura, fontes oficiais e riscos residuais permanecem ressalvas documentais, não condições para manter o gate aberto. O fechamento não é validação jurídica independente nem autorização de lançamento; GJ-04 continua pendente.
