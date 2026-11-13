# Canvas cósmico: fórmulas e regras de distribuição

Estado: entrevista encerrada a pedido do usuário. Anexo de referência de `canvas-cosmico.md`, com decisões aprovadas e parâmetros ainda abertos explicitamente identificados. Não representa implementação.

## Importância extrema

**Estas fórmulas são requisitos de EXTREMA IMPORTÂNCIA. Elas definem o comportamento central da visualização e devem orientar implementação, calibração e testes. Não podem ser substituídas silenciosamente por um layout genérico.**

O usuário confirmou gravitação universal, elasticidade pela lei de Hooke, colisões suaves, amortecimento e orçamento espacial fixo por nível. D-01 a D-06 foram aprovadas no desenvolvimento em 2026-11-08, conforme seção 15.2 da especificação e detalhes abaixo. Formato textual do fluxograma e outras decisões de interação continuam abertos.

## 1. Conteúdo e pesos

Decisões confirmadas:

- O conteúdo determina o tamanho, e o tamanho influencia a gravidade.
- Considerar quantidade de texto, blocos e itens de fluxograma na avaliação de conteúdo.
- Peso do conteúdo próprio: **0,5**.
- Peso das subnotas: **0,8**.
- O tamanho também considera as subnotas.
- Quantidade de conexões reforça o componente elástico.

Uma notação parcial para registrar os pesos é:

\[
Q_i = 0{,}5\,C_i + 0{,}8\,H_i
\]

`Q_i` representa o peso de conteúdo da nota; `C_i`, a medida do conteúdo próprio; `H_i`, a soma de C de todos os descendentes únicos no espaço avaliado (D-01). Uma nota compartilhada não é contada novamente por outro caminho. Aplicar 0,8 uma vez sobre H, sem multiplicá-lo a cada profundidade. Rejeitar ciclos e referências ausentes.

### Contagem ponderada do texto

O texto é medido por caracteres, não por palavras. Letras e números têm peso **1**; espaços e caracteres especiais têm peso **0,4**. Letras acentuadas, como “á” e “ç”, são letras normais e têm peso **1**.

\[
T_i = N_{letras\ e\ números} + 0{,}4\,N_{espaços\ e\ especiais}
\]

`T_i` é a medida ponderada do texto próprio da nota. Cada caractere pertence a uma categoria e é contado uma vez. Essa medida compõe `C_i`, sujeito ao coeficiente **0,5** do conteúdo próprio; ela não substitui o coeficiente das subnotas nem altera diretamente a elasticidade.

Exemplo: “Olá, ç1!” contém cinco letras/números e três espaços/especiais. Seu peso textual é `5 + 0,4 × 3 = 6,2`. A contribuição desse texto após o coeficiente de conteúdo próprio é `0,5 × 6,2 = 3,1`, antes das contribuições de blocos, fluxograma e subnotas.

A contagem usa a **fonte Markdown**, incluindo suas marcações. Por exemplo, `**Olá**` tem três letras e quatro asteriscos: peso textual `3 + 0,4 × 4 = 4,6`. Acentos não podem receber penalidade de caractere especial.

### Pesos complementares definidos por delegação

O usuário autorizou definir os demais pesos pelos critérios já aprovados. Foram adotados os seguintes valores, distinguindo essa definição delegada dos valores ditados diretamente por ele:

| Componente | Peso | Aplicação |
| --- | ---: | --- |
| Letra ou número, incluindo letras acentuadas | 1 | Contagem textual |
| Espaço ou caractere especial | 0,4 | Contagem textual da fonte Markdown |
| Bloco Markdown | 0,8 | Bônus estrutural além do texto |
| Item/nó do fluxograma | 0,8 | Bônus estrutural além de seu texto |
| Ligação interna do fluxograma | 0,4 | Elemento auxiliar do conteúdo |
| Conteúdo próprio completo | 0,5 | Coeficiente aplicado após somar seus componentes |
| Subnotas | 0,8 | Coeficiente da contribuição hierárquica |
| Espaço vazio | 2 | Peso reservado na distribuição espacial |

Blocos e nós recebem 0,8 por serem unidades estruturais, seguindo o critério das subnotas. Ligações internas recebem 0,4 por serem elementos auxiliares. Não são unidades físicas: são pontos de uma medida comum de conteúdo.

\[
C_i = T_i + 0{,}8 B_i + 0{,}8 V_i + 0{,}4 E_i
\]

- `B_i`: quantidade de blocos Markdown de nível superior, sem contar novamente seus descendentes. Um parágrafo, título, lista, citação, tabela ou bloco de código conta como um bloco; linhas vazias não criam blocos. Esta regra é de medição, não um novo catálogo de recursos do editor.
- `V_i`: quantidade de nós no fluxograma.
- `E_i`: quantidade de ligações internas do fluxograma. Não confundir com a reserva espacial `E` da seção seguinte.
- `T_i`: texto próprio contado uma vez. Em notas normais, usar a fonte Markdown; no fluxograma, somar os textos editáveis de nós e ligações. Não contar JSON de serialização, IDs, coordenadas nem propriedades visuais como texto.

Em uma nota normal, `V_i=E_i=0`. Um bloco contribui com seu texto uma vez e com um bônus estrutural de 0,8; o bônus não duplica a contagem dos caracteres. Conexões externas entre notas não entram em `C_i`: reforçam a elasticidade, conforme seção 4.

Exemplo: uma nota com o único parágrafo `**Olá**` tem `C_i=4,6+0,8=5,4`; sua contribuição própria é `0,5×5,4=2,7`. Um fluxograma com dois nós sem texto e uma ligação tem `C_i=0,8×2+0,4=2`; sua contribuição própria é `1`, antes das subnotas.

Para tornar a contagem consistente, cada caractere visível composto conta uma vez: acento combinado com uma letra não soma uma segunda unidade; um emoji composto conta como um caractere especial. Quebra de linha e tabulação valem 0,4 cada; normalizar CRLF e CR para LF antes da contagem evita diferenças entre sistemas. Estes critérios também foram definidos por delegação.

## 2. Orçamento espacial fixo por nível

Ao entrar em um universo, constelação, planeta ou outro nível, existe um espaço total fixo `X`. Os filhos e a reserva de espaço vazio precisam caber nele:

\[
X = \sum_{i=1}^{n} A_i + E
\]

- `A_i`: parcela de espaço atribuída ao filho `i`.
- `E`: reserva de espaço vazio, com peso **2** no cálculo de distribuição.
- `n`: quantidade de filhos diretos naquele espaço.

Adicionar filhos redistribui o mesmo orçamento: os existentes diminuem proporcionalmente para que todos caibam. Um filho com maior peso de conteúdo recebe participação maior. Não dividir igualmente por `n` ignorando os pesos.

A relação proporcional usa a reserva e o peso definidos em D-02:

\[
A_i = (X-E)\frac{w_i}{\sum_{j=1}^{n}w_j}
\]

`w_i=max(Q_i,1)` é o peso relativo do filho. X=1 por espaço e `E=max(0,2X; X×2/(2+soma(w)))`. Sem filhos, E=X. A reserva conserva peso 2 e tem piso de 20% do orçamento. O piso 1 dos filhos garante participação para notas vazias; não é um mínimo em pixels. A soma Ai+E deve conservar X dentro de tolerância absoluta 1e-12.

Exemplo matemático ilustrativo, sem fixar parâmetros do produto: se `X=100`, `E=20` e os pesos de dois filhos estão na razão `1:3`, as parcelas são `20` e `60`. A soma com o vazio é `100`.

Uma nota vazia mantém nome visível e alvo de toque de pelo menos 44×44 px (D-05). Esse alvo não infla Ai. Se vários alvos coincidirem, o toque oferece seus títulos para seleção. O grafo pode se espalhar com pan/zoom; X é orçamento da soma dos tamanhos, não confinamento dos círculos numa região fechada. Não esconder nomes por falta de espaço nem reduzir os alvos indefinidamente.

O rótulo no canvas exibe no máximo **20 caracteres do nome**, acrescentando “…” quando houver truncamento. O nome completo permanece preservado e disponível dentro da nota. Esse limite é de apresentação; não limita nem altera o nome armazenado. Esta regra não aprova ocultar os nomes automaticamente por falta de espaço.

**D-02/D-03/D-05 aprovadas:** X e Ai são áreas lógicas; raio=sqrt(Ai/π), massa=Ai. O mínimo de seleção é separado da área física. O peso 2 não significa 2%, dois pixels nem uma reserva fixa de duas unidades.

## 3. Gravitação universal

Fórmula confirmada explicitamente:

\[
F_g = G\frac{m_i m_j}{d_{ij}^{2}}
\]

- `G`: intensidade configurável; calibração inicial aprovada 0,0001.
- `m_i`, `m_j`: massas derivadas dos tamanhos das notas.
- `d_ij`: distância entre centros; usar mínimo numérico de 0,001 na gravidade.

Todas as notas no mesmo espaço visual se atraem, mesmo sem relacionamento. Notas maiores exercem mais atração; a força diminui com o quadrado da distância. Uma nota fixada continua exercendo atração sobre as demais.

Massa=Ai (D-03). D-04 aprova limitar o denominador à distância mínima de 0,001 e usar direção determinística pelos IDs em coincidência exata. Fora dessa proteção, conservar a lei inversa do quadrado. Verificar numericamente estabilidade e ausência de valores inválidos.

## 4. Elasticidade das conexões

Lei de Hooke confirmada:

\[
F_e = k(d-L)
\]

- `k`: rigidez da conexão.
- `d`: distância entre as notas conectadas.
- `L`: distância de equilíbrio da conexão.

Acima de `L`, a mola aproxima as notas; abaixo de `L`, afasta. A direção da força restaura o equilíbrio. A gravidade atua em conjunto com essa força: notas diretamente ligadas devem ficar mais próximas, formando agrupamentos semelhantes à proximidade de um sistema solar.

D-03/D-04: k efetivo=k×quantidade de conexões do par, com k inicial 0,2; L=raio_i+raio_j+folga, com folga inicial 0,04. Constantes são configuráveis e alterações de calibração precisam ser registradas.

## 5. Contato, colisão e amortecimento

As notas podem encostar e devem empurrar umas às outras suavemente. D-04 aprova Fcontato=32×max(0,raio_i+raio_j−d), com direção de separação. O coeficiente inicialmente aprovado em 20 foi corrigido explicitamente para 32 após verificação isolada revelar aprisionamento em sobreposição profunda. Colisão não substitui gravidade nem elasticidade.

O movimento perde energia com v×exp(−6dt). D-04 aprova passos de integração de 1/120 s, avanço limitado a 1/15 s, e repouso após velocidade inferior a 0,0001 durante 0,5 s. Essas aprovações não substituem testes em taxas de quadros distintas nem comprovam a simulação implementada.

## 6. Arraste e persistência

- Arrastar e soltar normalmente: a nota volta a se acomodar pelas forças.
- Soltar segurando Ctrl: fixa a nota naquela posição, continuando sua influência gravitacional.
- Arrastar uma nota fixada e soltar sem Ctrl: libera a nota para a física.
- No celular, um toque prolongado na nota abre um pequeno menu com a ação de fixar ou liberar a nota. É a alternativa ao modificador Ctrl.
- Salvar e restaurar posições e estado de fixação ao sair e voltar ao espaço.

## 7. Mobile first e adaptação dinâmica

Requisito confirmado: interface caprichada, projetada primeiro para celular, com adaptação dinâmica a telas de tamanhos diferentes.

- Canvas, nomes e controles precisam continuar legíveis e utilizáveis em telas pequenas e grandes.
- A nota vazia deve manter uma área confortável de seleção, incluindo interação por toque.
- A distribuição proporcional por pesos deve funcionar nos diferentes tamanhos de tela; não assumir uma resolução de desktop como medida universal.
- D-06: uma unidade lógica equivale a 1024 unidades do canvas. Mudanças de tela preservam identidade, hierarquia, posições, fixação, centro observado e zoom; ajustar só a translação da câmera.
- As interações necessárias devem ter alternativa utilizável em dispositivos sem teclado. Para fixação, foi confirmado o toque prolongado que abre o menu “Fixar / Liberar”.

O orçamento lógico X=1 e a escala de 1024 unidades de canvas são constantes (D-02/D-06). A janela observa uma parte do grafo com pan/zoom. D-05 separa tamanho físico e alvo mínimo de seleção; quando alvos coincidirem, oferecer escolha por títulos. A adaptação não altera posições/fixações nem esconde nomes por falta de espaço.

## 8. Verificações exigidas para a futura implementação

Estes são critérios a verificar, não resultados de testes já executados:

1. A soma das parcelas e do espaço vazio conserva `X`, dentro de tolerância numérica a definir.
2. Adicionar ou remover filhos redistribui o orçamento conforme os pesos; não aumenta `X`.
3. Conteúdo próprio e subnotas respeitam os coeficientes 0,5 e 0,8.
4. Com massas constantes, dobrar a distância reduz a gravidade a um quarto.
5. Com distância constante, dobrar uma massa dobra a força gravitacional.
6. A força elástica é zero em `d=L`; sua direção muda nos dois lados do equilíbrio.
7. A quantidade de conexões reforça linearmente a elasticidade (D-03).
8. Notas sem ligação continuam sujeitas à gravidade do mesmo espaço.
9. Contato permite encostar, com reação suave e recuperação da sobreposição.
10. Após uma interação isolada, o movimento dissipa energia e se estabiliza.
11. Notas fixadas não se deslocam, mas continuam atraindo as livres.
12. Reabrir o nível restaura posições e fixações.
13. Casos sem filhos, sem conteúdo, distância zero e muitos filhos respeitam D-01 a D-05 e não produzem valores inválidos.
14. Notas vazias mostram seu nome e são selecionáveis confortavelmente em telas pequenas e grandes; testar também por toque.
15. Redimensionar a tela preserva contexto e fixações, centro observado e zoom conforme D-06.
16. Os gestos necessários são utilizáveis no celular, incluindo uma alternativa à fixação por Ctrl.
17. Nomes com até 20 caracteres aparecem completos no canvas; nomes maiores exibem os primeiros 20 caracteres com “…” e permanecem completos dentro da nota, sem alteração do valor armazenado.
18. A contagem textual aplica peso 1 a letras, incluindo acentuadas, e números; aplica peso 0,4 a espaços e caracteres especiais. O exemplo “Olá, ç1!” resulta em 6,2 antes do coeficiente 0,5.
19. A fonte `**Olá**` resulta em peso textual 4,6 e, com um bloco, contribuição própria 2,7. Dois nós sem texto com uma ligação interna resultam em contribuição própria 1.
20. Acentos compostos e quebras de linha de diferentes sistemas produzem a mesma medida após normalização; ligações externas não são contadas como conteúdo próprio.

## 9. Tipos de conteúdo e conversão reversível

Existem dois tipos de conteúdo: nota normal e fluxograma. O tipo é definido ao editar a nota, independentemente de sua representação hierárquica como universo, constelação, planeta ou continente. Novas notas começam como nota normal.

O catálogo inicial do editor de fluxogramas inclui **início/fim, processo, decisão, entrada/saída e setas com texto**, como “Sim” e “Não”. Esses elementos existem dentro do conteúdo da nota; não representam novos tipos de nota nem níveis hierárquicos.

**O posicionamento dentro do fluxograma é manual:** ao arrastar e soltar um bloco, ele permanece na posição escolhida. A gravidade e a elasticidade da visualização de notas não se aplicam aos blocos internos do fluxograma. Essa organização permite controlar a disposição das etapas com precisão.

Ao mudar de nota normal para fluxograma, preservar o texto existente como descrição dentro da nota.

Ao mudar de fluxograma para nota normal, o usuário escolhe explicitamente entre:

1. Transformar o fluxograma em uma estrutura textual.
2. Apagar o fluxograma.

O usuário esclareceu o significado de reversibilidade: a conversão para texto produz um **bloco textual identificado**, dentro da nota, que representa a estrutura do fluxograma. Esse bloco pode ser editado ou apagado pelo usuário. Ao transformar novamente a nota em fluxograma, reconstruir o diagrama a partir da estrutura textual que ainda existir naquele momento, incorporando suas edições válidas. Preservar a descrição existente.

A reversibilidade pela estrutura textual depende da permanência desse bloco. Não foi confirmado um mecanismo separado de recuperação pelo histórico, nem a recuperação de um bloco apagado. Esta definição substitui a interpretação anterior de que seria obrigatório restaurar uma cópia original independentemente do texto atual.

Se a estrutura textual contiver erro, **bloquear a conversão para fluxograma**, manter o tipo e o conteúdo da nota intactos e indicar o erro para correção. Não gerar um diagrama parcial nem descartar o trecho inválido silenciosamente. O usuário precisa corrigir a estrutura antes de converter.

Se não existir nenhum bloco de estrutura de fluxograma na nota, a mudança de tipo cria um **fluxograma vazio**, mantendo o texto existente como descrição.

Ainda precisam ser definidos: formato do bloco e tratamento de múltiplos blocos. Não foi implementado nem testado nesta entrevista.

Critérios adicionais para a futura implementação:

- Nota normal para fluxograma preserva o texto como descrição.
- Fluxograma para nota normal exige a escolha entre conversão textual e exclusão.
- Converter em texto gera um bloco identificado que o usuário pode editar ou apagar.
- Voltar para fluxograma reconstrói a estrutura textual ainda existente, incluindo alterações válidas feitas nela.
- Não pressupor recuperação automática pelo histórico quando o bloco não existir mais.
- Estrutura inválida bloqueia a conversão, indica o erro e preserva o tipo e todo o conteúdo da nota.
- Sem bloco de estrutura, a mudança cria um fluxograma vazio e preserva o texto como descrição.
- O editor oferece os elementos iniciais aprovados e permite texto nas setas, incluindo rótulos de ramificação como “Sim” e “Não”.
- Arrastar um bloco do fluxograma mantém sua posição após soltá-lo; não executar a física de atração e elasticidade das notas sobre esses blocos.

## 10. Pesquisa e navegação até resultados

A pesquisa é acessada por um pequeno ícone de rosa dos ventos no canto inferior da tela. Ao acioná-lo, abrir um painel lateral flutuante, tendo o offcanvas do Bootstrap como referência de interação e apresentação, sem estabelecer uma nova dependência técnica nesta entrevista.

A busca abrange o universo atual e os demais universos. Apresentar os resultados em dois grupos visivelmente separados: **“Neste universo”** e **“Outros universos”**.

Ao selecionar um resultado próximo, navegar até a nota e abri-la com aproximação da câmera. Para um resultado distante, usar um **fade curto**: a cena atual desaparece suavemente e o destino aparece. Não percorrer visualmente um trajeto longo como se fosse um resultado próximo.

Depois de abrir um resultado de pesquisa, a ação **“Voltar” restaura o local anterior com o mesmo zoom e posição da câmera**.

Critérios para futura verificação: grupos de busca visualmente separados; aproximação para resultado próximo; fade para resultado distante; retorno preservando contexto e estado da câmera.

Ainda precisam ser definidos: limiar de proximidade, duração do fade e apresentação dos grupos quando nenhum universo estiver aberto.

## 11. Salvamento automático

As alterações na nota são salvas automaticamente após **1,5 segundo sem novas alterações**. Cada alteração reinicia essa contagem; não salvar periodicamente enquanto a edição continua sem pausa. Esse prazo substitui os três segundos definidos anteriormente.

Exibir os estados **“Salvando…”** e **“Salvo”**. O estado “Salvo” representa confirmação de persistência, não apenas o disparo da requisição.

Ao sair da nota com alterações pendentes, salvar imediatamente antes de concluir a navegação, sem esperar o restante do prazo de 1,5 segundo.

Critérios para futura verificação: uma pausa de 1,5 segundo inicia o salvamento; nova alteração antes do prazo reinicia a contagem; sair antes do prazo inicia salvamento imediato; não indicar “Salvo” antes da confirmação. Não há implementação nem testes desta regra nesta entrevista.

### Falha e reenvio

Se o salvamento falhar, manter as alterações em **cache** e tentar reenviar. Após a **terceira tentativa de salvamento malsucedida**, **cancelar o reenvio automático e informar o erro ao usuário**. Não iniciar uma quarta tentativa automática nesse ciclo. Não descartar o rascunho nem indicar “Salvo” por causa de uma falha.

Manter o **ícone de salvamento ativo durante as tentativas de reenvio**. Após a terceira falha, cancelar as tentativas automáticas, **parar a animação do ícone, indicar erro e oferecer “Tentar novamente”**. Preservar o rascunho na memória da aba e informar que existem alterações não salvas. Esta decisão detalha o pedido anterior de manter o ícone ativo: a animação permanece durante as tentativas, mas para quando o ciclo termina em erro.

Critérios adicionais: preservar o conteúdo pendente; contar as tentativas; cancelar o reenvio automático e exibir o erro na terceira falha; não iniciar a quarta tentativa automática; manter o ícone ativo durante as tentativas; após o cancelamento, parar a animação e oferecer “Tentar novamente”; mostrar “Salvo” somente após confirmação efetiva.

**Decisão revisada por segurança:** não persistir o rascunho no navegador para recuperação após fechar e reabrir. O cache de reenvio fica somente na memória da aba enquanto ela estiver aberta. Não gravar o conteúdo pendente em localStorage, sessionStorage, IndexedDB ou cache persistente de service worker. Esta decisão substitui o pedido anterior de recuperação entre sessões.

Fechar ou recarregar a página pode perder alterações ainda não confirmadas no banco. A fila de reenvio e o ícone de salvamento não representam persistência durável. A persistência normal da nota no banco continua sendo o destino do salvamento.

Se houver alterações ainda não salvas, solicitar o aviso de saída do navegador antes de fechar ou recarregar a página. O aviso deve indicar o risco de perda de alterações; em eventos de saída do navegador, sua apresentação e mensagem seguem as capacidades do navegador. Não tratar esse aviso como garantia de salvamento ou de execução de um reenvio durante o fechamento.

Critérios adicionais para futura verificação: o rascunho pendente não é escrito em armazenamento persistente do navegador e não é recuperado após recarregar ou fechar a aba; o aviso de fechamento ou recarga é solicitado somente enquanto houver alterações não confirmadas e deixa de ser solicitado após o salvamento confirmado.

A decisão D-08 foi aprovada em 2026-11-08 e implementada no RF-06: intervalo de 1,5 segundo entre falhas transitórias, três tentativas totais por ciclo, novo ciclo somente ao solicitar tentativa manual após erro, requisição única por vez e preservação das edições feitas durante o envio. Navegação aguarda confirmação; falha mantém a nota aberta. Conflitos e falhas de autorização não recebem reenvio automático. Consulte a seção 15.1 da especificação e a rastreabilidade para a política completa e as verificações locais.

## 12. Movimentação da hierarquia e conexões externas

Mover uma nota pai para outro universo, constelação ou espaço hierárquico leva **todas as suas subnotas**, preservando a hierarquia interna. Não separar silenciosamente os descendentes da nota movida.

A nota oferece a ação **“Mover para…”** em seu menu, com seleção do destino, para mudar de universo, constelação ou planeta. Essa ação muda o local hierárquico; o arraste comum continua sendo a interação de posicionamento já definida.

As conexões com notas que permaneceram no local anterior devem ser **preservadas**, inclusive entre universos diferentes. Apresentar essas conexões externas com **menor opacidade**, deixando visível que existem sem atrapalhar a leitura dos demais elementos.

Na visualização, as notas conectadas que pertencem ao exterior aparecem **puxadas para os cantos relativos da tela**, indicando a direção da conexão externa. Trata-se da representação de um destino exterior, que continua pertencendo ao seu espaço original; essa apresentação não constitui uma nova operação de mover a nota na hierarquia.

### Navegação pela conexão externa

Ao clicar na indicação de uma conexão externa, navegar visualmente pela hierarquia:

1. Afastar a câmera do local atual até visualizar o interior do **ascendente comum mais próximo** entre origem e destino.
2. A partir desse espaço comum, aproximar a câmera pelo caminho hierárquico até o local da nota alvo.

Essa transição revela a relação espacial entre os locais. **Para conexões externas, esta é a regra aprovada; não aplicar a proposta de aproximação direta ou fade conforme a distância.** O fade aprovado para resultados distantes da pesquisa permanece documentado separadamente na seção 10.

Exemplo derivado da regra: se origem e destino estão em constelações diferentes do mesmo universo, afastar até o interior desse universo e depois aproximar até o destino. A nota exterior é um destino navegável, não apenas um indicador decorativo.

Entre notas de **universos diferentes**, recuar até a **visão inicial das galáxias**, que funciona como referência comum acima dos universos, e então entrar no universo de destino até chegar à nota alvo. Essa passagem pela visão inicial foi confirmada explicitamente.

Ainda precisam ser definidos: valor numérico da opacidade, referência espacial para calcular a direção, agrupamento quando várias indicações ocupam o mesmo canto, eventual influência dessas representações na simulação física do espaço atual e duração da transição.

Critérios para futura verificação: movimentação inclui todos os descendentes; relações internas permanecem intactas; relações externas não são apagadas; conexões externas têm apresentação visual discreta e distinguível; notas exteriores são representadas nos cantos relativos sem alterar sua localização hierárquica real; clicar na indicação externa afasta até o ascendente comum mais próximo e aproxima até o destino.

Para conexões entre universos, verificar também a passagem pela visão inicial das galáxias antes da aproximação ao destino.

## 13. Conexões por comando e autocomplete global

Além das outras interações, oferecer a criação de conexão por comando:

- `/link x`
- `/l x` como abreviação.

Na validação visual, o usuário também empregou `$l x`, aceito no exemplo aprovado. Em 2026-11-11 (D-09) Rechi retirou essa forma: o produto aceita somente `/link` e `/l`, e `$link` não existe.

`x` é o título alvo ou o texto usado para procurá-lo. A busca é simples, pelo valor do título, e abrange todos os tipos e locais. Oferecer autocomplete para escolher o destino da conexão.

O autocomplete apresenta **uma única lista de até cinco títulos**, não dois grupos de cinco. Após o esclarecimento do usuário, **somente títulos que começam com os caracteres digitados são elegíveis**. A correspondência de prefixo é um filtro obrigatório, não apenas uma prioridade. Não incluir títulos populares sem esse prefixo nem títulos que contenham o termo somente no meio.

Se houver mais de cinco títulos com o prefixo, a lista contém apenas os cinco primeiros após a ordenação. Se houver menos, mostrar menos de cinco; **não preencher as vagas com títulos sem esse prefixo**. Essa regra substitui expressamente a interpretação anterior que permitia completar a lista com correspondências em outras posições.

Ordenação confirmada, nesta precedência:

1. Filtrar exclusivamente os títulos que começam com os caracteres digitados.
2. Entre os candidatos elegíveis, maior pontuação `S(t)` primeiro.
3. Em empate de pontuação, título em ordem alfabética.

Aplicar o limite de cinco **depois** de ordenar os resultados elegíveis, para não excluir prematuramente um destino com prioridade superior.

Exemplo fornecido pelo usuário: para `pla`, sugerir apenas títulos como “planta”, “planeta”, “plantera”, “plancton” e “placebo”. “Laranja”, “foguete” e “tangerina” ficam de fora mesmo que estejam entre os títulos mais populares. “Atlas dos planetas” também fica de fora porque não começa com `pla`.

### Pontuação de relevância

**Fórmula de extrema importância, definida pelo usuário:**

\[
S(t) = x_t + y_t + z_t
\]

- `x_t`: quantidade de acessos ao título alvo.
- `y_t`: quantidade de pesquisas pelo título alvo.
- `z_t`: quantidade de links ao título alvo.
- `S(t)`: pontuação usada para identificar os títulos mais acessados, pesquisados ou linkados nas sugestões.

Os três componentes têm peso unitário. Não substituir a soma por pesos diferentes, normalização ou decaimento temporal sem nova decisão. Essa pontuação pertence à descoberta de destinos; não altera os pesos de conteúdo nem as fórmulas de gravidade e elasticidade.

Exemplo: um destino com 10 acessos, 3 pesquisas e 2 links tem pontuação `10 + 3 + 2 = 15`.

Quando houver títulos iguais, mostrar o caminho hierárquico abaixo do nome, como “Universo → Constelação → Planeta”, permitindo distinguir os destinos. Essa apresentação foi confirmada pelo usuário.

Definido em 2026-11-11 (D-09): acesso conta a cada abertura do conteúdo da nota; pesquisa, a cada vez que a nota é escolhida num resultado da rosa dos ventos; links é a quantidade de conexões que a nota tem no momento. O prefixo é comparado sem diferenciar maiúsculas e acentos, descartando espaços iniciais.

Critérios para futura verificação: comandos longo e abreviado encontram os mesmos destinos; busca considera título e todos os tipos; autocomplete apresenta no máximo cinco sugestões no total; todo resultado começa com o texto digitado; não completar vagas com títulos sem esse prefixo; entre os candidatos elegíveis, pontuação decrescente e ordem alfabética como desempate; pontuação corresponde exatamente à soma dos três contadores.

## 14. Decisões abertas no encerramento

No encerramento original, estes temas permaneciam abertos. Em 2026-11-08, Rechi aprovou D-01 a D-06 e a conciliação nota/espaço da D-14, registradas na seção 15.2 da especificação e incorporadas acima. Em 2026-11-11, aprovou o formato do bloco textual, o tratamento de múltiplos blocos, os contadores, os limiares do zoom e o alcance da criptografia, registrados na seção 15.3 da especificação. Continuam abertos os tempos de animação, a migração dos dados existentes e o desenho de chaves. Aprovação de modelo não comprova implementação; consultar a rastreabilidade.

Este registro complementa `crow-vault-canvas.md` para o redesenho em discussão. Não declara que o comportamento atual já segue estas regras.
