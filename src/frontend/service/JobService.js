export class JobService {
    // Solicita o reset do banco de dados vetorial
    async reinitializeDb() {
        const response = await fetch('/api/init-db', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error("Erro ao reiniciar o ChromaDB");
        }

        return await response.json();
    }

    // Busca todas as vagas cadastradas no backend
    async getJobs() {
        const response = await fetch('/api/jobs');
        if (!response.ok) {
            throw new Error("Erro ao carregar lista de vagas");
        }
        return await response.json();
    }

}
