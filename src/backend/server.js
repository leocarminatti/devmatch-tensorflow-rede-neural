import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { getRecommendationsForCandidate, initializeDatabase } from './vectorService.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir a pasta frontend de forma estática (HTML, CSS e JS do browser)
app.use(express.static(path.join(process.cwd(), 'src', 'frontend')));

// Rota 1: Retornar a lista de todos os candidatos do JSON
app.get('/api/candidates', (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'data', 'candidates.json');
        const candidates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(candidates);
    } catch (error) {
        console.error("Erro ao ler candidatos:", error);
        res.status(500).json({ error: "Erro ao ler lista de candidatos." });
    }
});

// Rota para obter todas as vagas brutas (usada pelo Worker no treinamento)
app.get('/api/jobs', (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'data', 'jobs.json');
        const jobs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(jobs);
    } catch (error) {
        console.error("Erro ao ler vagas:", error);
        res.status(500).json({ error: "Erro ao ler lista de vagas." });
    }
});

// Rota 2: Recomendar vagas baseadas no candidato selecionado
app.post('/api/recommendations', async (req, res) => {
    try {
        const { candidateId } = req.body;

        if (!candidateId) {
            return res.status(400).json({ error: "candidateId é obrigatório." });
        }

        // Buscar as informações do candidato selecionado
        const candidatesPath = path.join(process.cwd(), 'data', 'candidates.json');
        const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
        const candidate = candidates.find(c => c.id === candidateId);

        if (!candidate) {
            return res.status(404).json({ error: "Candidato não encontrado." });
        }

        // Chamar o serviço vetorial para retornar as melhores vagas do ChromaDB
        const startTime = Date.now();
        const recommendations = await getRecommendationsForCandidate(candidate, 100);
        const queryTimeMs = Date.now() - startTime;

        res.json({
            candidate,
            recommendations,
            queryTimeMs
        });
    } catch (error) {
        console.error("Erro ao buscar recomendações:", error);
        res.status(500).json({ error: "Erro ao consultar banco vetorial." });
    }
});

// Rota 3: Recarregar dados/limpar banco manualmente
app.post('/api/init-db', async (req, res) => {
    try {
        const result = await initializeDatabase();
        res.json({ message: "ChromaDB reinicializado!", ...result });
    } catch (error) {
        console.error("Erro ao reiniciar banco:", error);
        res.status(500).json({ error: "Falha na inicialização do ChromaDB." });
    }
});

// Inicialização segura do servidor
async function start() {
    console.log("----------------------------------------------------------------");
    console.log("Iniciando o servidor do Job Matcher...");
    console.log("----------------------------------------------------------------");

    try {
        // Tentar alimentar o ChromaDB na inicialização
        await initializeDatabase();
        console.log("Banco de dados vetorial inicializado com sucesso.");
    } catch (err) {
        console.warn("⚠️ AVISO: Não foi possível conectar ao ChromaDB na inicialização.");
        console.warn("Certifique-se de que o ChromaDB local está rodando (porta 8000).");
        console.warn("Você pode iniciar o ChromaDB depois e reiniciar as tabelas clicando no botão de Reset da tela.");
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor backend Express rodando em: http://localhost:${PORT}`);
        console.log(`💻 Abra essa URL no seu navegador para testar!\n`);
    });
}

start();
