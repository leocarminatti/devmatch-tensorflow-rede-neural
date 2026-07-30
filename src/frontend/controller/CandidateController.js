import Events from '../events/events.js';

export class CandidateController {
    constructor(candidateView, candidateService) {
        this.view = candidateView;
        this.service = candidateService;
        this.candidates = [];
        this.activeCandidate = null;

        this.setupListeners();
    }

    static init(config) {
        return new CandidateController(config.candidateView, config.candidateService);
    }

    setupListeners() {
        // Ouvir quando a View avisa que um candidato foi selecionado no combo-box
        Events.onCandidateSelected(async (candidateId) => {
            await this.selectCandidate(candidateId);
        });
    }

    // Carrega a lista inicial do servidor Express
    async loadCandidates() {
        try {
            this.candidates = await this.service.getCandidates();
            this.view.renderCandidatesList(this.candidates);
        } catch (error) {
            console.error("Erro ao carregar lista de candidatos:", error);
        }
    }

    // Processa a seleção de um candidato específico
    async selectCandidate(candidateId) {
        try {
            this.activeCandidate = this.candidates.find(c => c.id === candidateId);
            if (!this.activeCandidate) return;

            // Calcula o vetor local para exibição na tela
            const displayVector = this.vectorizeCandidateLocal(this.activeCandidate);

            // Desenha os dados na tela
            this.view.renderActiveCandidate(this.activeCandidate, displayVector);

            // Chama o serviço Express que bate no ChromaDB
            const data = await this.service.getRecommendations(candidateId);

            // Dispara evento global contendo as recomendações de vagas e o candidato em contexto
            Events.dispatchRecommendationsLoaded({
                candidate: this.activeCandidate, // <-- Enviando o objeto do candidato junto!
                recommendations: data.recommendations,
                queryTimeMs: data.queryTimeMs
            });

        } catch (error) {
            console.error("Erro ao selecionar candidato:", error);
        }
    }

    // Função de vetorização didática (idêntica ao do backend para exibir na tela)
    vectorizeCandidateLocal(candidate) {
        const expNorm = Math.min(candidate.experience_years / 10, 1);
        const salaryNorm = Math.min(Math.max((candidate.target_salary - 2000) / 18000, 0), 1);

        const hasReact = candidate.skills.some(s => ["React", "CSS", "Javascript"].includes(s)) ? 1.0 : 0.0;
        const hasNode = candidate.skills.some(s => ["Node.js", "PostgreSQL"].includes(s)) ? 1.0 : 0.0;
        const hasMobile = candidate.skills.some(s => ["Flutter", "Dart", "Mobile"].includes(s)) ? 1.0 : 0.0;

        let remoteVal = 0.0;
        if (candidate.remote_pref === "Remoto") remoteVal = 1.0;
        else if (candidate.remote_pref === "Híbrido") remoteVal = 0.5;

        return [expNorm, salaryNorm, hasReact, hasNode, hasMobile, remoteVal];
    }
}
