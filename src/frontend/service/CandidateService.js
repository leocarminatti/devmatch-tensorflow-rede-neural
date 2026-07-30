export class CandidateService {
    // Busca todos os candidatos cadastrados no JSON backend
    async getCandidates() {
        const response = await fetch('/api/candidates');
        if (!response.ok) {
            throw new Error("Erro ao carregar candidatos");
        }
        return await response.json();
    }

    // Solicita as recomendações de vagas baseadas no ID do candidato selecionado
    async getRecommendations(candidateId) {
        const response = await fetch('/api/recommendations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidateId })
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar recomendações vetoriais");
        }

        return await response.json();
    }
}
