import { ChromaClient } from 'chromadb';
import fs from 'fs';
import path from 'path';

// Conectar ao banco de dados rodando localmente na porta 8000
const client = new ChromaClient({ path: "http://localhost:8000" });
const COLLECTION_NAME = "jobs_collection";

/**
 * Converte uma vaga (job) em um vetor numérico de 6 dimensões.
 * Vetor gerado: [anos_exp_normalizado, salario_normalizado, react_flag, node_flag, flutter_flag, remoto_flag]
 */
export function vectorizeJob(job) {
    // Normaliza a experiência (limite de 10 anos mapeia para 0 a 1)
    const expNorm = Math.min(job.experience_years / 10, 1);

    // Normaliza o salário (escala de R$2.000 a R$20.000 mapeada para 0 a 1)
    const salaryNorm = Math.min(Math.max((job.salary - 2000) / 18000, 0), 1);

    // Flags binárias (1.0 se tiver a skill, 0.0 se não tiver)
    const hasReact = job.skills.some(s => ["React", "CSS", "Javascript"].includes(s)) ? 1.0 : 0.0;
    const hasNode = job.skills.some(s => ["Node.js", "PostgreSQL"].includes(s)) ? 1.0 : 0.0;
    const hasMobile = job.skills.some(s => ["Flutter", "Dart", "Mobile"].includes(s)) ? 1.0 : 0.0;

    // Escala para modelo de trabalho
    let remoteVal = 0.0;
    if (job.remote === "Remoto") remoteVal = 1.0;
    else if (job.remote === "Híbrido") remoteVal = 0.5;

    return [expNorm, salaryNorm, hasReact, hasNode, hasMobile, remoteVal];
}

/**
 * Converte um candidato em um vetor numérico de 6 dimensões usando a mesma escala do Job.
 */
export function vectorizeCandidate(candidate) {
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

/**
 * Inicializa a coleção no ChromaDB carregando as vagas de jobs.json
 */
export async function initializeDatabase() {
    try {
        console.log("Reinicializando banco de dados no ChromaDB...");

        // Deleta se já existir (para evitar duplicados em testes)
        try {
            await client.deleteCollection({ name: COLLECTION_NAME });
        } catch (e) { }

        // Cria a coleção usando similaridade de Cosseno como espaço métrico
        const collection = await client.createCollection({
            name: COLLECTION_NAME,
            metadata: { "hnsw:space": "cosine" }
        });

        // Carrega vagas de jobs.json
        const dataPath = path.join(process.cwd(), 'data', 'jobs.json');
        const jobs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const ids = [];
        const embeddings = [];
        const metadatas = [];
        const documents = [];

        jobs.forEach(job => {
            ids.push(job.id);
            embeddings.push(vectorizeJob(job));
            metadatas.push({
                title: job.title,
                company: job.company,
                salary: job.salary,
                experience_years: job.experience_years,
                remote: job.remote,
                skills: job.skills.join(', ')
            });
            documents.push(job.description);
        });

        // Grava no banco vetorial
        await collection.add({ ids, embeddings, metadatas, documents });
        console.log(`ChromaDB alimentado com ${jobs.length} vagas.`);
        return { success: true, count: jobs.length };
    } catch (error) {
        console.error("Erro no ChromaDB:", error);
        throw error;
    }
}

/**
 * Consulta o ChromaDB buscando as vagas mais próximas (menor distância de cosseno)
 */
export async function getRecommendationsForCandidate(candidate, limit = 100) {
    const collection = await client.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { "hnsw:space": "cosine" }
    });

    const candidateVector = vectorizeCandidate(candidate);

    // Faz a consulta vetorial no ChromaDB
    const results = await collection.query({
        queryEmbeddings: [candidateVector],
        nResults: limit
    });

    const recommendations = [];
    if (results && results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
            const distance = results.distances[0][i];

            // Similaridade = 1 - Distância
            const similarity = Math.max(0, 1 - distance);
            const percentageMatch = Math.round(similarity * 100);

            recommendations.push({
                id: results.ids[0][i],
                title: results.metadatas[0][i].title,
                company: results.metadatas[0][i].company,
                salary: Number(results.metadatas[0][i].salary),
                experience_years: Number(results.metadatas[0][i].experience_years),
                remote: results.metadatas[0][i].remote,
                skills: results.metadatas[0][i].skills.split(', '),
                description: results.documents[0][i],
                score: percentageMatch // Score formatado de 0% a 100%
            });
        }
    }
    return recommendations.sort((a, b) => b.score - a.score);
}
