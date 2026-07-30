import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

// Representa os pesos didáticos das features na hora de codificar
const WEIGHTS = {
    experience: 0.3,
    salary: 0.3,
    react: 0.2,
    node: 0.1,
    flutter: 0.1,
    remote: 0.1
};

/**
 * Função para normalizar e codificar um candidato em vetor (6D)
 */
function encodedCandidate(candidate) {
    const expNorm = Math.min(candidate.experience_years / 10, 1) * WEIGHTS.experience;
    const salaryNorm = Math.min(Math.max((candidate.target_salary - 2000) / 18000, 0), 1) * WEIGHTS.salary;

    const hasReact = candidate.skills.some(s => ["React", "CSS", "Javascript"].includes(s)) ? 1.0 : 0.0;
    const hasNode = candidate.skills.some(s => ["Node.js", "PostgreSQL"].includes(s)) ? 1.0 : 0.0;
    const hasMobile = candidate.skills.some(s => ["Flutter", "Dart", "Mobile"].includes(s)) ? 1.0 : 0.0;

    let remoteVal = 0.0;
    if (candidate.remote_pref === "Remoto") remoteVal = 1.0;
    else if (candidate.remote_pref === "Híbrido") remoteVal = 0.5;

    return [
        expNorm,
        salaryNorm,
        hasReact * WEIGHTS.react,
        hasNode * WEIGHTS.node,
        hasMobile * WEIGHTS.flutter,
        remoteVal * WEIGHTS.remote
    ];
}

/**
 * Função para normalizar e codificar uma vaga em vetor (6D)
 */
function encodeJob(job) {
    const expNorm = Math.min(job.experience_years / 10, 1) * WEIGHTS.experience;
    const salaryNorm = Math.min(Math.max((job.salary - 2000) / 18000, 0), 1) * WEIGHTS.salary;

    const hasReact = job.skills.some(s => ["React", "CSS", "Javascript"].includes(s)) ? 1.0 : 0.0;
    const hasNode = job.skills.some(s => ["Node.js", "PostgreSQL"].includes(s)) ? 1.0 : 0.0;
    const hasMobile = job.skills.some(s => ["Flutter", "Dart", "Mobile"].includes(s)) ? 1.0 : 0.0;

    let remoteVal = 0.0;
    if (job.remote === "Remoto") remoteVal = 1.0;
    else if (job.remote === "Híbrido") remoteVal = 0.5;

    return [
        expNorm,
        salaryNorm,
        hasReact * WEIGHTS.react,
        hasNode * WEIGHTS.node,
        hasMobile * WEIGHTS.flutter,
        remoteVal * WEIGHTS.remote
    ];
}

/**
 * Simula se um candidato aplicaria para uma vaga baseado em afinidade com ruído (estatística real)
 */
function shouldSimulateApply(candidate, job) {
    // 1. Verifica intersecção de tecnologias (skills)
    const hasSkillOverlap = candidate.skills.some(s => job.skills.includes(s));

    // 2. Compatibilidade salarial (diferença de até 40% da pretensão)
    const salaryDiff = Math.abs(candidate.target_salary - job.salary) / candidate.target_salary;
    const isSalaryAcceptable = salaryDiff <= 0.4;

    // 3. Experiência compatível (anos do candidato é no mínimo os anos da vaga - 2 anos)
    const isExperienceAcceptable = candidate.experience_years >= (job.experience_years - 2);

    // Regra 100% determinística (sem Math.random())
    // Retorna Match (1) se e somente se houver intersecção de skills, salário razoável e experiência compatível
    if (hasSkillOverlap && isSalaryAcceptable && isExperienceAcceptable) {
        return 1;
    }

    return 0;
}

/**
 * Cria a matriz de inputs e labels dinamicamente
 */
function createTrainingData(candidates, jobs) {
    const inputs = [];
    const labels = [];

    candidates.forEach(candidate => {
        const candidateVector = encodedCandidate(candidate);

        jobs.forEach(job => {
            const jobVector = encodeJob(job);

            // Gerar o label (1 ou 0) de forma probabilística e ruidosa
            const label = shouldSimulateApply(candidate, job);

            inputs.push([...candidateVector, ...jobVector]);
            labels.push(label);
        });
    });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimension: 12
    };
}

/**
 * Configura a estrutura da rede neural e treina o modelo
 */
async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();

    // 1. Camada de Entrada - 128 neurônios
    model.add(tf.layers.dense({
        inputShape: [trainData.inputDimension],
        units: 128,
        activation: 'relu'
    }));

    // 2. Camada Oculta - 64 neurônios
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
    }));

    // 3. Camada Oculta - 32 neurônios
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));

    // 4. Camada de Saída - 1 neurônio com Sigmoid
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));

    // Compilar o modelo
    model.compile({
        optimizer: tf.train.adam(0.01), // Taxa de aprendizado moderada e estável
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });



    // Treinar o modelo
    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                // Envia o progresso de logs de volta para a UI
                postMessage({
                    action: 'trainingLog',
                    epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    });

    return model;
}

let _model = null; // Variável global para armazenar o modelo treinado

/**
 * Função executada ao receber o comando de treinar
 */
async function trainModel(candidates, jobs) {
    console.log("Iniciando treino da Rede Neural no Worker...");
    const trainData = createTrainingData(candidates, jobs);

    // Treina o modelo e salva na variável global
    _model = await configureNeuralNetAndTrain(trainData);

    // Avisa a UI que o treino acabou
    postMessage({ action: 'trainingComplete' });
}

/**
 * Função executada para fazer a predição (ranking) das vagas recuperadas do ChromaDB
 */
function recommend(candidate, recommendations) {
    if (!_model) {
        console.warn("Modelo não treinado ainda. Retornando dados originais.");
        postMessage({ action: 'recommend', recommendations });
        return;
    }

    const candidateVector = encodedCandidate(candidate);

    // Cria a lista de entrada combinada para cada vaga
    const inputs = recommendations.map(job => {
        const jobVector = encodeJob(job);
        return [...candidateVector, ...jobVector];
    });

    // Converte a lista em tensor 2D de entrada
    const inputTensor = tf.tensor2d(inputs);

    // Executa a predição na rede neural (Executa o predict!)
    const predictions = _model.predict(inputTensor);
    const scores = predictions.dataSync(); // Extrai os resultados numéricos

    // Atualiza o score das vagas com a nota predita pela Rede Neural
    const rankedRecommendations = recommendations.map((job, index) => {
        const tfScore = Math.round(scores[index] * 100);
        return {
            ...job,
            score: tfScore // Substitui o match do cosseno pelo match da Rede Neural!
        };
    });

    // Ordena do maior match para o menor
    const sortedRecommendations = rankedRecommendations.sort((a, b) => b.score - a.score);

    // Envia o resultado ordenado de volta para a UI
    postMessage({
        action: 'recommend',
        recommendations: sortedRecommendations
    });
}

// Ouvir mensagens enviadas pela thread principal do navegador
self.onmessage = async (e) => {
    const { action, candidates, jobs, candidate, recommendations } = e.data;

    if (action === 'train') {
        await trainModel(candidates, jobs);
    } else if (action === 'recommend') {
        recommend(candidate, recommendations);
    }
};
