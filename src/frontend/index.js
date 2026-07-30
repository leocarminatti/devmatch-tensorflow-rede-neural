import { CandidateController } from './controller/CandidateController.js';
import { JobController } from './controller/JobController.js';
import { WorkerController } from './controller/WorkerController.js'; // <-- Importando o WorkerController
import { CandidateService } from './service/CandidateService.js';
import { JobService } from './service/JobService.js';
import { CandidateView } from './view/CandidateView.js';
import { JobView } from './view/JobView.js';

// 1. Instanciar Serviços
const candidateService = new CandidateService();
const jobService = new JobService();

// 2. Instanciar Views
const candidateView = new CandidateView();
const jobView = new JobView();

// 3. Inicializar o Web Worker rodando o TensorFlow
const mlWorker = new Worker('./workers/modelTrainingWorker.js', { type: 'module' });

// 4. Inicializar os Controllers
const candidateController = CandidateController.init({
    candidateView,
    candidateService
});

JobController.init({
    jobView,
    jobService
});

const workerController = WorkerController.init({
    worker: mlWorker
});

// 5. Função para inicializar os dados e rodar o treinamento inicial da Rede Neural
async function initApp() {
    try {
        // Carregar os candidatos na barra lateral
        await candidateController.loadCandidates();

        // Carregar a lista de todas as vagas brutas para o treinamento do TensorFlow
        const jobs = await jobService.getJobs();

        // Disparar o treinamento inicial no Worker
        workerController.triggerTrain(candidateController.candidates, jobs);
    } catch (error) {
        console.error("Erro na inicialização da aplicação:", error);
    }
}

// Rodar inicialização
initApp();

// Configurar o clique no botão de retreinar
const btnRetrain = document.getElementById('btn-retrain');
if (btnRetrain) {
    btnRetrain.addEventListener('click', async () => {
        try {
            const jobs = await jobService.getJobs();
            workerController.triggerTrain(candidateController.candidates, jobs);
        } catch (error) {
            console.error("Erro ao retreinar Rede Neural:", error);
        }
    });
}
