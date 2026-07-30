import Events from '../events/events.js';

export class WorkerController {
    constructor({ worker }) {
        this.worker = worker;
        this.alreadyTrained = false;
        this.lastQueryTimeMs = 0;
        this.lossPoints = [];
        this.accPoints = [];

        this.init();
    }

    static init(config) {
        return new WorkerController(config);
    }

    init() {
        this.setupCallbacks();
    }

    setupCallbacks() {
        // Escutar clique no botão de mostrar/ocultar gráficos (visor)
        const btnToggleVisor = document.getElementById('btn-toggle-visor');
        if (btnToggleVisor) {
            btnToggleVisor.addEventListener('click', () => {
                if (window.tfvis) {
                    tfvis.visor().toggle();
                    const isOpen = tfvis.visor().isOpen();
                    btnToggleVisor.innerHTML = isOpen 
                        ? `<i class="fa-solid fa-chart-line"></i> Fechar Gráficos`
                        : `<i class="fa-solid fa-chart-line"></i> Ver Gráficos`;
                }
            });
        }

        // 1. Escutar mensagens retornadas pelo Web Worker (TensorFlow)
        this.worker.onmessage = (event) => {
            const { action, recommendations, epoch, loss, accuracy } = event.data;

            if (action === 'trainingLog') {
                console.log(`Epoch ${epoch}: Loss = ${loss.toFixed(4)}, Acc = ${accuracy.toFixed(4)}`);
                // Plotar no visor do tfjs-vis
                if (window.tfvis) {
                    this.plotTrainingLogs(epoch, loss, accuracy);
                }
            }

            if (action === 'trainingComplete') {
                console.log("Rede Neural do TensorFlow.js treinada com sucesso!");
                this.alreadyTrained = true;

                // Fechar o visor de gráficos automaticamente
                if (window.tfvis) {
                    tfvis.visor().close();
                }

                // Atualizar o texto visual de status
                const statusText = document.querySelector('.status-indicator span:last-child');
                if (statusText) statusText.textContent = "ChromaDB + Rede Neural pronta";

                // Re-habilitar seleção de candidatos e botão de retreinar
                const selectElement = document.getElementById('candidate-select');
                if (selectElement) selectElement.disabled = false;

                const btnRetrain = document.getElementById('btn-retrain');
                if (btnRetrain) btnRetrain.disabled = false;

                // Exibir botão do visor em modo "Ver Gráficos"
                if (btnToggleVisor) {
                    btnToggleVisor.style.display = 'flex';
                    btnToggleVisor.innerHTML = `<i class="fa-solid fa-chart-line"></i> Ver Gráficos`;
                }
            }

            if (action === 'recommend') {
                // Dispara o evento de vagas PRONTAS (ordenadas pela rede neural)
                Events.dispatchRecommendationsReady({
                    recommendations,
                    queryTimeMs: this.lastQueryTimeMs
                });
            }
        };

        // 2. Interceptar quando o ChromaDB retornar as vagas recomendadas
        Events.onRecommendationsLoaded((data) => {
            this.lastQueryTimeMs = data.queryTimeMs;

            if (this.alreadyTrained) {
                // Se a rede neural estiver treinada, rodamos a predição (predict)
                this.triggerRecommend(data.candidate, data.recommendations);
            } else {
                // Caso contrário, enviamos as vagas cruas do ChromaDB direto para a tela
                Events.dispatchRecommendationsReady({
                    recommendations: data.recommendations,
                    queryTimeMs: data.queryTimeMs
                });
            }
        });
    }

    // Envia sinal ao Worker para iniciar o treinamento
    triggerTrain(candidates, jobs) {
        this.alreadyTrained = false;
        this.lossPoints = [];
        this.accPoints = [];

        const statusText = document.querySelector('.status-indicator span:last-child');
        if (statusText) statusText.textContent = "Treinando Rede Neural...";

        // Desabilitar seleção de candidatos e botão de retreinar durante o treino
        const selectElement = document.getElementById('candidate-select');
        if (selectElement) selectElement.disabled = true;

        const btnRetrain = document.getElementById('btn-retrain');
        if (btnRetrain) btnRetrain.disabled = true;

        // Ocultar botão do visor
        const btnToggleVisor = document.getElementById('btn-toggle-visor');
        if (btnToggleVisor) btnToggleVisor.style.display = 'none';

        // Abrir o painel visor do tfjs-vis
        if (window.tfvis) {
            tfvis.visor().open();
        }

        this.worker.postMessage({
            action: 'train',
            candidates,
            jobs
        });
    }

    // Envia sinal ao Worker para rodar a predição
    triggerRecommend(candidate, recommendations) {
        this.worker.postMessage({
            action: 'recommend',
            candidate,
            recommendations
        });
    }

    // Renderiza gráficos de perda e precisão dinamicamente no visor
    plotTrainingLogs(epoch, loss, accuracy) {
        this.lossPoints.push({ x: epoch, y: loss });
        this.accPoints.push({ x: epoch, y: accuracy });

        tfvis.render.linechart(
            { name: 'Precisão (Accuracy)', tab: 'Treinamento' },
            { values: this.accPoints, series: ['Acurácia'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Acurácia (%)',
                height: 200
            }
        );

        tfvis.render.linechart(
            { name: 'Erro (Loss)', tab: 'Treinamento' },
            { values: this.lossPoints, series: ['Perda'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Valor do Erro',
                height: 200
            }
        );
    }
}
