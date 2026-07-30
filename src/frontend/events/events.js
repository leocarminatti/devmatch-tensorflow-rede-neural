import { events } from "./constants.js";

export default class Events {
    // Evento: Seleção de Candidato
    static onCandidateSelected(callback) {
        document.addEventListener(events.candidateSelected, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchCandidateSelected(candidate) {
        const event = new CustomEvent(events.candidateSelected, {
            detail: candidate
        });
        document.dispatchEvent(event);
    }

    // Evento: Recomendações Carregadas do Servidor
    static onRecommendationsLoaded(callback) {
        document.addEventListener(events.recommendationsLoaded, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchRecommendationsLoaded(data) {
        const event = new CustomEvent(events.recommendationsLoaded, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    // Evento: Vaga curtida
    static onJobLiked(callback) {
        document.addEventListener(events.jobLiked, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchJobLiked(job) {
        const event = new CustomEvent(events.jobLiked, {
            detail: job
        });
        document.dispatchEvent(event);
    }

    // Evento: Vaga ignorada
    static onJobDisliked(callback) {
        document.addEventListener(events.jobDisliked, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchJobDisliked(job) {
        const event = new CustomEvent(events.jobDisliked, {
            detail: job
        });
        document.dispatchEvent(event);
    }

    // Evento: Banco de dados resetado
    static onDbReinitialized(callback) {
        document.addEventListener(events.dbReinitialized, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchDbReinitialized(data) {
        const event = new CustomEvent(events.dbReinitialized, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    // Evento: Recomendações pós-processadas pela Rede Neural (Prontas para a tela)
    static onRecommendationsReady(callback) {
        document.addEventListener(events.recommendationsReady, (event) => {
            return callback(event.detail);
        });
    }
    static dispatchRecommendationsReady(data) {
        const event = new CustomEvent(events.recommendationsReady, {
            detail: data
        });
        document.dispatchEvent(event);
    }
}
