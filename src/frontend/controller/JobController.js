import Events from '../events/events.js';

export class JobController {
    constructor(jobView, jobService) {
        this.view = jobView;
        this.service = jobService;
        this.currentCandidateId = null;

        this.setupListeners();
    }

    static init(config) {
        return new JobController(config.jobView, config.jobService);
    }

    setupListeners() {
        // Quando um candidato é selecionado
        Events.onCandidateSelected((candidateId) => {
            this.currentCandidateId = candidateId;
        });

        // Quando novas vagas recomendadas estão prontas (após ranking da Rede Neural)
        Events.onRecommendationsReady((data) => {
            this.view.renderJobRecommendations(data.recommendations, data.queryTimeMs);
        });

        // Quando o usuário clica no reset do banco
        Events.onDbReinitialized(async () => {
            try {
                await this.service.reinitializeDb();
                this.view.renderInitialState();
                this.view.showResetSuccess();

                // Se já tinha um candidato ativo selecionado, refaz a busca
                const selectElement = document.getElementById('candidate-select');
                if (selectElement && selectElement.value) {
                    Events.dispatchCandidateSelected(selectElement.value);
                }
            } catch (error) {
                console.error("Erro ao resetar banco:", error);
            }
        });
    }
}
