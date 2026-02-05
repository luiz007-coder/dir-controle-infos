        const SUPABASE_URL = 'https://ztbnthhangadfonqrmyk.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_DSJYBbzFPxgckls6vaFxVQ_iGo_CAmu';

        let DADOS = {
            usuarios: [],
            relatorios: [],
            acompanhamentos: [],
            log_acoes: [],
            estatisticas: { total_usuarios: 0, total_relatorios: 0, usuarios_hoje: 0 },
            acessos: {
                presidencia: [],
                diretoria: [],
                intermediaria: [],
                desenvolvedor: []
            },
            solicitacoes: []
        };

        let USUARIO_ATUAL = '';
        let USUARIO_CARGO = '';
        const PAGE_SIZE = 3;
        const state = { posts: { page: 1, filter: '' }, info: { page: 1, filter: '' }, profile: { page: 1, user: '' } };
        let reprovarNick = '';

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
        <i class="ph ${type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-x-circle' : 'ph-warning-circle'} toast-icon"></i>
        <span>${message}</span>
    `;
            container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => container.removeChild(toast), 300);
            }, 3000);
        }

        function atualizarNotificacoes() {
            const pendentes = DADOS.solicitacoes.filter(s => s.status === 'pendente').length;
            const cargo = verificarAcesso();

            const menuAdmin = document.getElementById('menu-admin');
            const drawerMenuAdmin = document.getElementById('drawer-menu-admin');

            if ((cargo === 'desenvolvedor' || cargo === 'presidencia' || cargo === 'diretoria') && pendentes > 0) {
                let badge = menuAdmin.querySelector('.notificacao-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'notificacao-badge';
                    menuAdmin.appendChild(badge);
                }
                badge.textContent = pendentes;

                let drawerBadge = drawerMenuAdmin.querySelector('.notificacao-badge');
                if (!drawerBadge) {
                    drawerBadge = document.createElement('div');
                    drawerBadge.className = 'notificacao-badge';
                    drawerMenuAdmin.appendChild(drawerBadge);
                }
                drawerBadge.textContent = pendentes;
            } else {
                const badge = menuAdmin.querySelector('.notificacao-badge');
                if (badge) badge.remove();
                const drawerBadge = drawerMenuAdmin.querySelector('.notificacao-badge');
                if (drawerBadge) drawerBadge.remove();
            }
        }

        async function pegarUsername() {
            try {
                let resposta = await fetch("/forum");
                let html = await resposta.text();
                let regex = /_userdata\["username"\]\s*=\s*"([^"]+)"/;
                let match = html.match(regex);
                if (match && match[1]) {
                    return match[1];
                }
            } catch (err) {
                console.error('Erro ao pegar username:', err);
            }
            return ',youiz';
        }

        function verificarAcesso() {
            const nick = USUARIO_ATUAL.toLowerCase();

            if (DADOS.acessos.desenvolvedor.includes(nick)) {
                return 'desenvolvedor';
            }
            if (DADOS.acessos.presidencia.includes(nick)) {
                return 'presidencia';
            }
            if (DADOS.acessos.diretoria.includes(nick)) {
                return 'diretoria';
            }
            if (DADOS.acessos.intermediaria.includes(nick)) {
                return 'intermediaria';
            }

            const solicitacao = DADOS.solicitacoes.find(s => s.nick.toLowerCase() === nick);
            if (solicitacao && solicitacao.status === 'reprovada') {
                return 'reprovado';
            }

            return 'sem_acesso';
        }

        function temAcesso() {
            const cargo = verificarAcesso();
            return cargo !== 'sem_acesso' && cargo !== 'reprovado';
        }

        function atualizarInterfaceAcesso() {
            const cargo = verificarAcesso();
            const authOverlay = document.getElementById('auth-overlay');
            const mainContent = document.querySelector('.content');
            const identificandoOverlay = document.getElementById('identificando-overlay');

            let paginaAtual = '';
            if (!document.getElementById('dashboard-page').classList.contains('hidden')) paginaAtual = 'dashboard';
            if (!document.getElementById('search-page').classList.contains('hidden')) paginaAtual = 'search';
            if (!document.getElementById('info-page').classList.contains('hidden')) paginaAtual = 'info';
            if (!document.getElementById('profile-page').classList.contains('hidden')) paginaAtual = 'profile';
            if (!document.getElementById('admin-panel-page').classList.contains('hidden')) paginaAtual = 'admin';

            identificandoOverlay.classList.add('hidden');

            if (!temAcesso()) {
                authOverlay.classList.remove('hidden');
                mainContent.classList.add('hidden');

                const messageEl = document.getElementById('auth-message');
                const solicitacao = DADOS.solicitacoes.find(s => s.nick.toLowerCase() === USUARIO_ATUAL.toLowerCase());
                const authBtn = document.getElementById('auth-submit-btn');
                const authNick = document.getElementById('auth-nickname');

                if (authNick) authNick.value = USUARIO_ATUAL;

                if (solicitacao && solicitacao.status === 'reprovada') {
                    messageEl.textContent = `Sua solicitação foi reprovada. Motivo: ${solicitacao.motivo || 'Não especificado'}.`;
                    messageEl.classList.add('error');
                    messageEl.style.display = 'block';
                    if (authBtn) {
                        authBtn.disabled = false;
                        authBtn.textContent = 'SOLICITAR NOVAMENTE';
                    }
                } else if (solicitacao && solicitacao.status === 'pendente') {
                    messageEl.textContent = 'Sua solicitação está pendente de análise pela diretoria.';
                    messageEl.classList.add('warning');
                    messageEl.style.display = 'block';
                    if (authBtn) {
                        authBtn.disabled = true;
                        authBtn.textContent = 'SOLICITAÇÃO PENDENTE';
                    }
                } else if (solicitacao && solicitacao.status === 'aprovada') {
                    messageEl.textContent = 'Solicitação aprovada! Redirecionando...';
                    messageEl.classList.add('success');
                    messageEl.style.display = 'block';
                    if (authBtn) {
                        authBtn.disabled = true;
                        authBtn.textContent = 'ACESSO APROVADO';
                    }
                    setTimeout(() => {
                        carregarDados().then(() => {
                            atualizarInterfaceAcesso();
                        });
                    }, 1500);
                } else {
                    messageEl.style.display = 'none';
                    if (authBtn) {
                        authBtn.disabled = false;
                        authBtn.textContent = 'SOLICITAR ACESSO';
                    }
                }
            } else {
                authOverlay.classList.add('hidden');
                mainContent.classList.remove('hidden');

                const menuAdmin = document.getElementById('menu-admin');
                const drawerAdmin = document.getElementById('drawer-menu-admin');

                if (cargo === 'desenvolvedor' || cargo === 'presidencia' || cargo === 'diretoria') {
                    menuAdmin.classList.remove('hidden');
                    drawerAdmin.classList.remove('hidden');
                }

                if (paginaAtual) {
                    document.getElementById('dashboard-page').classList.add('hidden');
                    document.getElementById('search-page').classList.add('hidden');
                    document.getElementById('info-page').classList.add('hidden');
                    document.getElementById('profile-page').classList.add('hidden');
                    document.getElementById('admin-panel-page').classList.add('hidden');

                    ['menu-dashboard', 'menu-search', 'menu-info', 'menu-admin'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.remove('active');
                    });

                    const drawerMenuAdmin = document.getElementById('drawer-menu-admin');
                    if (drawerMenuAdmin) drawerMenuAdmin.classList.remove('active');

                    if (paginaAtual === 'dashboard') {
                        document.getElementById('dashboard-page').classList.remove('hidden');
                        document.getElementById('menu-dashboard')?.classList.add('active');
                        setHeaderTitle('CONTROLE DE INFORMAÇÕES');
                    } else if (paginaAtual === 'search') {
                        document.getElementById('search-page').classList.remove('hidden');
                        fixLayoutWidthToHeader('search-page');
                        document.getElementById('menu-search')?.classList.add('active');
                        setHeaderTitle('POSTAGENS');
                    } else if (paginaAtual === 'info') {
                        document.getElementById('info-page').classList.remove('hidden');
                        fixLayoutWidthToHeader('info-page');
                        document.getElementById('menu-info')?.classList.add('active');
                        setHeaderTitle('INFORMAÇÕES');
                    } else if (paginaAtual === 'profile') {
                        document.getElementById('profile-page').classList.remove('hidden');
                        fixLayoutWidthToHeader('profile-page');
                        setHeaderTitle(state.profile.user);
                    } else if (paginaAtual === 'admin') {
                        document.getElementById('admin-panel-page').classList.remove('hidden');
                        document.getElementById('menu-admin')?.classList.add('active');
                        drawerMenuAdmin?.classList.add('active');
                        setHeaderTitle('PAINEL DE CONTROLE');
                    }
                } else {
                    switchPage('dashboard');
                }

                atualizarNotificacoes();
                atualizarPerfilInterface();
            }
        }

        async function solicitarAcesso(nick) {
            const existe = DADOS.solicitacoes.find(s => s.nick.toLowerCase() === nick.toLowerCase());

            if (existe && existe.status === 'pendente') {
                showToast('Você já tem uma solicitação pendente!', 'warning');
                return false;
            }

            if (existe && existe.status === 'aprovada') {
                showToast('Você já tem acesso ao sistema!', 'warning');
                return false;
            }

            if (existe && existe.status === 'reprovada') {
                const index = DADOS.solicitacoes.findIndex(s => s.nick.toLowerCase() === nick.toLowerCase());
                DADOS.solicitacoes.splice(index, 1);
            }

            const motivoAutomatico = "Desejo acesso ao controle de informações da EI.";

            DADOS.solicitacoes.push({
                nick: nick,
                motivo: motivoAutomatico,
                status: 'pendente',
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });

            const sucesso = await salvarDados();
            if (sucesso) {
                showToast('Solicitação enviada com sucesso!');
                atualizarInterfaceAcesso();
                atualizarNotificacoes();
                return true;
            }
            return false;
        }

        async function processarSolicitacao(nick, acao, motivo = '') {
            const solicitacao = DADOS.solicitacoes.find(s => s.nick.toLowerCase() === nick.toLowerCase());
            if (!solicitacao) return false;

            solicitacao.status = acao;
            solicitacao.motivo = motivo;
            solicitacao.processado_por = USUARIO_ATUAL;
            solicitacao.data_processamento = new Date().toISOString().replace('T', ' ').slice(0, 19);

            if (acao === 'aprovada') {
                DADOS.acessos.intermediaria.push(nick.toLowerCase());
            }

            const sucesso = await salvarDados();
            if (sucesso) {
                showToast(`Solicitação ${acao} com sucesso!`);
                renderAdminPanel();
                atualizarNotificacoes();
                return true;
            }
            return false;
        }

        async function gerenciarCargo(nick, cargo, acao) {
            const nickLower = nick.toLowerCase();
            let mudou = false;

            if (acao === 'adicionar') {
                if (cargo === 'presidencia' && !DADOS.acessos.presidencia.includes(nickLower)) {
                    DADOS.acessos.presidencia.push(nickLower);
                    mudou = true;
                } else if (cargo === 'diretoria' && !DADOS.acessos.diretoria.includes(nickLower)) {
                    DADOS.acessos.diretoria.push(nickLower);
                    mudou = true;
                } else if (cargo === 'intermediaria' && !DADOS.acessos.intermediaria.includes(nickLower)) {
                    DADOS.acessos.intermediaria.push(nickLower);
                    mudou = true;
                } else if (cargo === 'desenvolvedor' && !DADOS.acessos.desenvolvedor.includes(nickLower)) {
                    DADOS.acessos.desenvolvedor.push(nickLower);
                    mudou = true;
                }
            } else if (acao === 'remover') {
                if (cargo === 'presidencia') {
                    const index = DADOS.acessos.presidencia.indexOf(nickLower);
                    if (index > -1) {
                        DADOS.acessos.presidencia.splice(index, 1);
                        mudou = true;
                    }
                } else if (cargo === 'diretoria') {
                    const index = DADOS.acessos.diretoria.indexOf(nickLower);
                    if (index > -1) {
                        DADOS.acessos.diretoria.splice(index, 1);
                        mudou = true;
                    }
                } else if (cargo === 'intermediaria') {
                    const index = DADOS.acessos.intermediaria.indexOf(nickLower);
                    if (index > -1) {
                        DADOS.acessos.intermediaria.splice(index, 1);
                        mudou = true;
                    }
                } else if (cargo === 'desenvolvedor') {
                    const index = DADOS.acessos.desenvolvedor.indexOf(nickLower);
                    if (index > -1) {
                        DADOS.acessos.desenvolvedor.splice(index, 1);
                        mudou = true;
                    }
                }
            }

            if (mudou) {
                const sucesso = await salvarDados();
                if (sucesso) {
                    showToast(`Cargo ${cargo} ${acao === 'adicionar' ? 'adicionado' : 'removido'} para ${nick}`);
                    renderAdminPanel();
                    if (nick.toLowerCase() === USUARIO_ATUAL.toLowerCase()) {
                        atualizarInterfaceAcesso();
                    }
                    return true;
                }
            }
            return false;
        }

        async function carregarDados() {
            try {
                const resposta = await fetch(SUPABASE_URL + '/rest/v1/dados_sistema?select=*', {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                if (resposta.ok) {
                    const dadosArray = await resposta.json();
                    if (dadosArray && dadosArray.length > 0) {
                        DADOS = dadosArray[0].conteudo;
                    } else {
                        DADOS = obterDadosIniciais();
                        await salvarDados();
                    }
                } else {
                    DADOS = obterDadosIniciais();
                }
            } catch (erro) {
                DADOS = obterDadosIniciais();
            }

            atualizarInterfaceAcesso();
            if (temAcesso()) {
                atualizarTodasInterfaces();
                renderAdminPanel();
            }
            return DADOS;
        }

        async function salvarDados() {
            try {
                const checkResposta = await fetch(SUPABASE_URL + '/rest/v1/dados_sistema?select=id', {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY
                    }
                });

                if (!checkResposta.ok) {
                    return false;
                }

                const registros = await checkResposta.json();
                let resposta;

                if (registros && registros.length > 0) {
                    const id = registros[0].id;
                    resposta = await fetch(SUPABASE_URL + '/rest/v1/dados_sistema?id=eq.' + id, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            conteudo: DADOS,
                            updated_at: new Date().toISOString()
                        })
                    });
                } else {
                    resposta = await fetch(SUPABASE_URL + '/rest/v1/dados_sistema', {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            conteudo: DADOS
                        })
                    });
                }

                if (resposta.ok) {
                    return true;
                } else {
                    return false;
                }

            } catch (erro) {
                return false;
            }
        }

        function obterDadosIniciais() {
            return {
                usuarios: [],
                relatorios: [],
                acompanhamentos: [],
                log_acoes: [],
                estatisticas: { total_usuarios: 0, total_relatorios: 0, usuarios_hoje: 0 },
                acessos: { presidencia: [], diretoria: [], intermediaria: [], desenvolvedor: [] },
                solicitacoes: []
            };
        }

        async function registrarExecutivo(nick, autor) {
            const existe = DADOS.usuarios.some(u => u.nick.toLowerCase() === nick.toLowerCase());
            if (existe) {
                showToast(`Executivo ${nick} já está registrado!`, 'warning');
                return false;
            }

            DADOS.usuarios.push({
                nick: nick,
                status: "Livre",
                data_registro: new Date().toISOString().split('T')[0],
                registrado_por: autor
            });

            DADOS.log_acoes.push({
                tipo: "registro_executivo",
                nick: nick,
                responsavel: autor,
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });

            DADOS.estatisticas.total_usuarios = DADOS.usuarios.length;
            DADOS.estatisticas.usuarios_hoje += 1;

            const sucesso = await salvarDados();
            if (sucesso) {
                showToast(`Executivo ${nick} registrado com sucesso!`);
                atualizarTodasInterfaces();
                return true;
            }
            return false;
        }

        async function excluirExecutivo(nick, autor) {
            const confirmado = await modalConfirm(`Tem certeza que deseja excluir ${nick}?`);
            if (!confirmado) return false;

            const index = DADOS.usuarios.findIndex(u => u.nick.toLowerCase() === nick.toLowerCase());
            if (index === -1) {
                showToast(`Executivo ${nick} não encontrado!`, 'error');
                return false;
            }

            DADOS.usuarios.splice(index, 1);
            DADOS.acompanhamentos = DADOS.acompanhamentos.filter(a => a.executivo.toLowerCase() !== nick.toLowerCase());

            DADOS.log_acoes.push({
                tipo: "exclusao_executivo",
                nick: nick,
                responsavel: autor,
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });

            DADOS.estatisticas.total_usuarios = DADOS.usuarios.length;

            const sucesso = await salvarDados();
            if (sucesso) {
                showToast(`Executivo ${nick} excluído com sucesso!`);
                atualizarTodasInterfaces();
                return true;
            }
            return false;
        }
        async function postarRelatorio(autor, alvo, texto, print_url) {
            const novoId = DADOS.relatorios.length > 0
                ? Math.max(...DADOS.relatorios.map(r => r.id)) + 1
                : 1;
            DADOS.relatorios.unshift({
                id: novoId,
                autor: autor,
                alvo: alvo,
                texto: texto,
                print: print_url || "",
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });
            DADOS.log_acoes.push({
                tipo: "novo_relatorio",
                autor: autor,
                alvo: alvo,
                responsavel: autor,
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });
            DADOS.estatisticas.total_relatorios = DADOS.relatorios.length;
            const jaAcompanhado = DADOS.acompanhamentos.some(a => a.executivo.toLowerCase() === alvo.toLowerCase());
            if (!jaAcompanhado) {
                DADOS.acompanhamentos.push({
                    executivo: alvo,
                    responsavel: autor,
                    status: "ativo"
                });
            }
            const sucesso = await salvarDados();
            if (sucesso) {
                showToast(`Relatório postado com sucesso!`);
                atualizarTodasInterfaces();
                return true;
            }
            return false;
        }
        async function atualizarStatusExecutivo(nick, novoStatus, autor) {
            const usuario = DADOS.usuarios.find(u => u.nick.toLowerCase() === nick.toLowerCase());
            if (!usuario) {
                showToast(`Executivo ${nick} não encontrado!`, 'error');
                return false;
            }
            const statusAnterior = usuario.status;
            usuario.status = novoStatus;
            DADOS.log_acoes.push({
                tipo: "atualizacao_status",
                nick: nick,
                status_anterior: statusAnterior,
                status_novo: novoStatus,
                responsavel: autor,
                data: new Date().toISOString().replace('T', ' ').slice(0, 19)
            });
            if (novoStatus === "Não tem interesse") {
                DADOS.acompanhamentos = DADOS.acompanhamentos.filter(a => a.executivo.toLowerCase() !== nick.toLowerCase());
            }
            const sucesso = await salvarDados();
            if (sucesso) {
                showToast(`Status de ${nick} atualizado para: ${novoStatus}`);
                atualizarTodasInterfaces();
                return true;
            }
            return false;
        }
        function atualizarTodasInterfaces() {
            renderRegistered();
            renderFollowUps();
            renderActions();
            renderRanking();
            renderStatistics();
            ['posts', 'info'].forEach(mode => {
                renderFeed(mode);
                renderPagination(mode);
                renderProfile(mode);
            });
            if (state.profile.user) {
                renderProfileSidebar();
                renderProfileFeed();
                renderProfilePagination();
            }
        }
        function renderRegistered() {
            const tbody = document.getElementById('registered-body');
            if (!tbody) return;

            tbody.innerHTML = DADOS.usuarios.map(u => {
                let statusClass = '';
                if (u.status === 'Livre') statusClass = 'status-livre';
                else if (u.status === 'Acompanhado/Auxiliado') statusClass = 'status-acompanhado';
                else if (u.status === 'Não tem interesse') statusClass = 'status-nao-tem-interesse';

                return `
                <tr>
                    <td>
                        <div class="habbo-cell">
                            <img src="${avatarHeadUrl(u.nick)}" />
                            <span>${u.nick}</span>
                        </div>
                    </td>
                    <td><span class="${statusClass}">${u.status}</span></td>
                </tr>
            `}).join('');
        }

        function renderFollowUps() {
            const tbody = document.getElementById('followups-body');
            if (!tbody) return;

            tbody.innerHTML = DADOS.acompanhamentos.map(f => `
        <tr>
            <td>
                <div class="habbo-cell">
                    <img src="${avatarHeadUrl(f.executivo)}" />
                    <span>${f.executivo}</span>
                </div>
            </td>
            <td>
                <div class="habbo-cell">
                    <img src="${avatarHeadUrl(f.responsavel)}" />
                    <span>${f.responsavel}</span>
                </div>
            </td>
        </tr>
    `).join('');
        }

        function renderActions() {
            const list = document.getElementById('action-list');
            if (!list) return;

            const ultimasAcoes = [...DADOS.log_acoes]
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 3);

            list.innerHTML = ultimasAcoes.map(a => `
        <div class="action-item">
            <div class="action-avatar"><img src="${avatarHeadUrl(a.nick || a.autor || '')}" /></div>
            <div class="action-info">
                <span>${formatarLogAcao(a)}</span>
                <span class="action-time">${formatarData(a.data)}</span>
            </div>
        </div>
    `).join('');
        }

        function formatarLogAcao(log) {
            switch (log.tipo) {
                case 'registro_executivo':
                    return `${log.responsavel} registrou ${log.nick}`;
                case 'exclusao_executivo':
                    return `${log.responsavel} excluiu ${log.nick}`;
                case 'atualizacao_status':
                    return `${log.responsavel} alterou status de ${log.nick}`;
                case 'novo_relatorio':
                    return `${log.autor} postou relatório sobre ${log.alvo}`;
                default:
                    return `Ação: ${log.tipo}`;
            }
        }

        function formatarData(dataString) {
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const data = new Date(dataString.replace(' ', 'T'));

            const dataBR = new Date(data.getTime() - 3 * 60 * 60 * 1000);

            const dia = String(dataBR.getDate()).padStart(2, '0');
            const mes = meses[dataBR.getMonth()];
            const ano = dataBR.getFullYear();
            const horas = String(dataBR.getHours()).padStart(2, '0');
            const minutos = String(dataBR.getMinutes()).padStart(2, '0');

            return `${dia} ${mes} ${ano} ${horas}:${minutos}h`;
        }

        function renderRanking() {
            const list = document.getElementById('ranking-list');
            if (!list) return;

            const ranking = {};

            DADOS.relatorios.forEach(relatorio => {
                if (!ranking[relatorio.autor]) ranking[relatorio.autor] = 0;
                ranking[relatorio.autor]++;
            });

            const rankingArray = Object.entries(ranking)
                .map(([nick, count]) => ({ nick, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            list.innerHTML = rankingArray.map((r, idx) => `
        <div class="ranking-item rank-${idx + 1}">
            <div class="ranking-pos">${idx + 1}º</div>
            <div class="habbo-cell">
                <img src="${avatarHeadUrl(r.nick)}" />
                <span>${r.nick} - ${r.count} registros</span>
            </div>
        </div>
    `).join('');

            if (rankingArray.length === 0) {
                list.innerHTML = '<div style="color:#888;text-align:center;padding:20px 0;">Sem dados de ranking.</div>';
            }
        }

        function renderStatistics() {
            const infosEl = document.getElementById('stats-infos');
            const regsEl = document.getElementById('stats-registers');
            const upsEl = document.getElementById('stats-updates');

            if (!infosEl || !regsEl || !upsEl) return;

            const hoje = new Date().toISOString().split('T')[0];
            const relatoriosHoje = DADOS.relatorios.filter(r => r.data.startsWith(hoje)).length;
            const registrosHoje = DADOS.usuarios.filter(u => u.data_registro === hoje).length;
            const updatesHoje = DADOS.log_acoes.filter(l =>
                l.tipo === 'atualizacao_status' && l.data.startsWith(hoje)
            ).length;

            infosEl.textContent = relatoriosHoje;
            regsEl.textContent = registrosHoje;
            upsEl.textContent = updatesHoje;
        }

        function avatarUrl(user) {
            return `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(user)}&action=std,crr=65&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
        }

        function avatarHeadUrl(user) {
            return `https://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(user)}&action=std,crr=65&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=1&size=l`;
        }

        function getFilteredData(mode) {
            const f = state[mode].filter.trim().toLowerCase();
            if (!f) return [];

            return mode === 'posts'
                ? DADOS.relatorios.filter(i => i.autor.toLowerCase() === f)
                : DADOS.relatorios.filter(i => i.alvo.toLowerCase() === f);
        }

        function isSearching(mode) { return state[mode].filter.trim().length > 0; }

        function renderProfile(mode) {
            const filtered = getFilteredData(mode);
            const countEl = document.getElementById(`profile-info-count-${mode}`);
            const avatarEl = document.getElementById(`profile-avatar-${mode}`);
            const placeholderEl = document.getElementById(`profile-placeholder-${mode}`);
            const feedListEl = document.getElementById(`feed-list-${mode}`);

            if (!isSearching(mode) || filtered.length === 0) {
                countEl.textContent = `Nenhuma informação encontrada.`;
                avatarEl.classList.add('hidden');
                placeholderEl.style.display = 'flex';
                if (feedListEl) feedListEl.innerHTML = '<div style="color:#888;text-align:center;padding:32px 0;">Nenhuma informação encontrada.</div>';
            } else {
                countEl.textContent = `${filtered.length} informação(ões) disponível(eis)`;
                const userForAvatar = state[mode].filter || (mode === 'posts' ? filtered[0].autor : filtered[0].alvo);
                avatarEl.src = avatarUrl(userForAvatar);
                avatarEl.classList.remove('hidden');
                placeholderEl.style.display = 'none';
            }
        }

        function renderFeed(mode) {
            const listEl = document.getElementById(`feed-list-${mode}`);
            const data = getFilteredData(mode);
            if (!isSearching(mode) || data.length === 0) { listEl.innerHTML = ''; return; }
            const page = state[mode].page;
            const start = (page - 1) * PAGE_SIZE;
            const items = data.slice(start, start + PAGE_SIZE);
            listEl.innerHTML = items.map(item => {
                const poster = item.autor;
                const target = item.alvo;
                const avatarUser = mode === 'posts' ? target : poster;
                const headerName = mode === 'posts' ? target : poster;
                const MAX_CHARS = 350;
                let texto = item.texto;
                let showReadMore = false;
                if (texto.length > MAX_CHARS) {
                    texto = texto.slice(0, MAX_CHARS) + '...';
                    showReadMore = true;
                }
                return `
        <div class="feed-item">
            <div class="feed-header-badge">${headerName} - ${formatarData(item.data)}</div>
            <div class="feed-content-card">
                <div class="feed-avatar-box">
                    <img src="${avatarUrl(avatarUser)}" alt="Avatar">
                </div>
                <div class="feed-content">
                    <p>${texto}</p>
                    ${showReadMore ? `<button class='ler-mais-btn' onclick='this.previousElementSibling.textContent = ${JSON.stringify(item.texto)}; this.style.display = "none";'>Ler mais</button>` : ''}
                    ${item.print ? `<p>Print: <a href="${item.print}" style="color:#7CFF9B;" target="_blank">${item.print}</a></p>` : ``}
                </div>
            </div>
        </div>`;
            }).join('');
        }

        function renderPagination(mode) {
            const pagEl = document.getElementById(`pagination-${mode}`);
            const total = getFilteredData(mode).length;
            const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            if (!isSearching(mode) || totalPages === 0) { pagEl.innerHTML = ''; return; }
            state[mode].page = Math.min(Math.max(state[mode].page, 1), totalPages);
            const cur = state[mode].page;
            const start = Math.max(1, Math.min(cur - 1, totalPages - 2));
            const pages = [];
            for (let i = start; i <= Math.min(totalPages, start + 2); i++) pages.push(i);
            let html = `<button class="page-btn" data-prev="true"><i class="ph ph-caret-left"></i></button>`;
            pages.forEach(i => {
                const active = (i === cur) ? 'active' : '';
                const label = String(i).padStart(2, '0');
                html += `<button class="page-btn ${active}" data-page="${i}">${label}</button>`;
            });
            html += `<button class="page-btn" data-next="true"><i class="ph ph-caret-right"></i></button>`;
            pagEl.innerHTML = html;
            pagEl.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prev = btn.getAttribute('data-prev');
                    const next = btn.getAttribute('data-next');
                    if (prev) state[mode].page = Math.max(1, cur - 1);
                    else if (next) state[mode].page = Math.min(totalPages, cur + 1);
                    else state[mode].page = Math.min(Math.max(parseInt(btn.getAttribute('data-page'), 10), 1), totalPages);
                    renderFeed(mode); renderPagination(mode); renderProfile(mode);
                });
            });
        }

        function getProfileData() {
            if (!state.profile.user) return [];
            const u = state.profile.user.toLowerCase();
            return DADOS.relatorios.filter(i => i.autor.toLowerCase() === u);
        }

        function renderProfileSidebar() {
            const user = state.profile.user;
            const avatarEl = document.getElementById('profile-avatar-profile');
            const nickEl = document.getElementById('profile-nick-display');
            const countEl = document.getElementById('profile-info-count-profile');
            if (!user) {
                nickEl.textContent = '';
                avatarEl.src = '';
                countEl.textContent = `0 informação(ões) disponível(eis)`;
                return;
            }

            const nickLower = user.toLowerCase();
            const cargos = [];

            if (DADOS.acessos.desenvolvedor.includes(nickLower)) cargos.push('DEV');
            if (DADOS.acessos.presidencia.includes(nickLower)) cargos.push('Pres.DIR');
            if (DADOS.acessos.diretoria.includes(nickLower)) cargos.push('DIR');
            if (DADOS.acessos.intermediaria.includes(nickLower)) cargos.push('EI');

            const cargoBadge = cargos.length > 0 ? 
                '<span class="role-badge ' + 
                (cargos.includes('DEV') ? 'desenvolvedor' :
                cargos.includes('Pres.DIR') ? 'presidencia' :
                cargos.includes('DIR') ? 'dir' : 'ei') + '">' + 
                cargos.join('/') + '</span>' : '';

            nickEl.innerHTML = user + cargoBadge;
            avatarEl.src = avatarUrl(user);
            const total = getProfileData().length;
            countEl.textContent = `${total} informação(ões) disponível(eis)`;
        }

        function renderProfileFeed() {
            const listEl = document.getElementById('feed-list-profile');
            const data = getProfileData();
            if (!state.profile.user || data.length === 0) { listEl.innerHTML = ''; return; }
            const page = state.profile.page;
            const start = (page - 1) * PAGE_SIZE;
            const items = data.slice(start, start + PAGE_SIZE);
            const user = state.profile.user;
            listEl.innerHTML = items.map(item => {
                const target = item.alvo;
                const MAX_CHARS = 350;
                let texto = item.texto;
                let showReadMore = false;
                if (texto.length > MAX_CHARS) {
                    texto = texto.slice(0, MAX_CHARS) + '...';
                    showReadMore = true;
                }
                return `
        <div class="feed-item">
            <div class="feed-header-badge">${target} - ${formatarData(item.data)}</div>
            <div class="feed-content-card">
                <div class="feed-avatar-box">
                    <img src="${avatarUrl(target)}" alt="Avatar">
                </div>
                <div class="feed-content">
                    <p>${texto}</p>
                    ${showReadMore ? `<button class='ler-mais-btn' onclick='this.previousElementSibling.textContent = ${JSON.stringify(item.texto)}; this.style.display = "none";'>Ler mais</button>` : ''}
                    ${item.print ? `<p>Print: <a href="${item.print}" style="color:#7CFF9B;" target="_blank">${item.print}</a></p>` : ``}
                </div>
            </div>
        </div>`;
            }).join('');
        }

        function renderProfilePagination() {
            const pagEl = document.getElementById('pagination-profile');
            const total = getProfileData().length;
            const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            if (!state.profile.user || totalPages === 0) { pagEl.innerHTML = ''; return; }
            state.profile.page = Math.min(Math.max(state.profile.page, 1), totalPages);
            const cur = state.profile.page;
            const start = Math.max(1, Math.min(cur - 1, totalPages - 2));
            const pages = [];
            for (let i = start; i <= Math.min(totalPages, start + 2); i++) pages.push(i);
            let html = `<button class="page-btn" data-prev="true"><i class="ph ph-caret-left"></i></button>`;
            pages.forEach(i => {
                const active = (i === cur) ? 'active' : '';
                const label = String(i).padStart(2, '0');
                html += `<button class="page-btn ${active}" data-page="${i}">${label}</button>`;
            });
            html += `<button class="page-btn" data-next="true"><i class="ph ph-caret-right"></i></button>`;
            pagEl.innerHTML = html;
            pagEl.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prev = btn.getAttribute('data-prev');
                    const next = btn.getAttribute('data-next');
                    if (prev) state.profile.page = Math.max(1, cur - 1);
                    else if (next) state.profile.page = Math.min(totalPages, cur + 1);
                    else state.profile.page = Math.min(Math.max(parseInt(btn.getAttribute('data-page'), 10), 1), totalPages);
                    renderProfileFeed(); renderProfilePagination(); renderProfileSidebar();
                });
            });
        }

        function renderAdminPanel() {
            const pendingList = document.getElementById('admin-pending-list');
            const usersList = document.getElementById('admin-users-list');

            if (!pendingList || !usersList) return;

            const pendentes = DADOS.solicitacoes.filter(s => s.status === 'pendente');
            pendingList.innerHTML = pendentes.map(s => `
        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-weight: bold;">${s.nick}</div>
                <div style="font-size: 10px; color: #888;">${formatarData(s.data)}</div>
            </div>
            <div style="font-size: 11px; color: #ccc; margin-bottom: 8px;">${s.motivo}</div>
            <div style="display: flex; gap: 6px;">
                <button onclick="aprovarSolicitacao('${s.nick}')" style="background: #85e300; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">Aprovar</button>
                <button onclick="abrirModalReprovar('${s.nick}')" style="background: #ff4757; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">Reprovar</button>
            </div>
        </div>
    `).join('');

            if (pendentes.length === 0) {
                pendingList.innerHTML = '<div style="color:#888;text-align:center;padding:20px 0;">Nenhuma solicitação pendente.</div>';
            }

            const todosNicks = [
                ...DADOS.acessos.desenvolvedor,
                ...DADOS.acessos.presidencia,
                ...DADOS.acessos.diretoria,
                ...DADOS.acessos.intermediaria
            ];

            const nicksUnicos = [...new Set(todosNicks.map(nick => nick.toLowerCase()))];
            const totalUsuariosUnicos = nicksUnicos.length;

            const todosUsuarios = nicksUnicos.map(nickLower => {
                const nickOriginal = todosNicks.find(n => n.toLowerCase() === nickLower);
                const cargos = [];
                
                if (DADOS.acessos.desenvolvedor.includes(nickLower)) cargos.push('DEV');
                if (DADOS.acessos.presidencia.includes(nickLower)) cargos.push('Pres.DIR');
                if (DADOS.acessos.diretoria.includes(nickLower)) cargos.push('DIR');
                if (DADOS.acessos.intermediaria.includes(nickLower)) cargos.push('EI');
                
                return { 
                    nick: nickOriginal || nickLower, 
                    cargos: cargos,
                    cargosArray: cargos.map(c => {
                        if (c === 'DEV') return 'desenvolvedor';
                        if (c === 'Pres.DIR') return 'presidencia';
                        if (c === 'DIR') return 'diretoria';
                        return 'intermediaria';
                    })
                };
            });

            usersList.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 8px;">
                    <div style="font-size: 11px; color: #fff;">Total de usuários: <strong>${totalUsuariosUnicos}</strong></div>
                </div>
                <input id="admin-search-users" class="form-input" placeholder="Pesquisar nick..." style="width:100%; margin-bottom:12px; padding:8px 12px; background:#1f1f1f; border:1px solid #444; color:#fff; border-radius:6px; font-size:12px;" />
                ${todosUsuarios.map(u => {
                    let cargoClass = '';
                    if (u.cargos.includes('DEV')) cargoClass = 'desenvolvedor';
                    else if (u.cargos.includes('Pres.DIR')) cargoClass = 'presidencia';
                    else if (u.cargos.includes('DIR')) cargoClass = 'dir';
                    else cargoClass = 'ei';
                    
                    const cargoLabel = u.cargos.join('/');
                    
                    return `
                        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="font-weight: bold;">${u.nick}</div>
                                    <div style="font-size: 10px;" class="role-badge ${cargoClass}">${cargoLabel}</div>
                                </div>
                                ${(verificarAcesso() === 'desenvolvedor' || verificarAcesso() === 'presidencia' || (verificarAcesso() === 'diretoria' && !u.cargos.includes('DEV') && !u.cargos.includes('Pres.DIR') && !u.cargos.includes('DIR'))) ? `
                                <div style="display: flex; gap: 4px;">
                                    ${u.cargosArray.map(cargo => `
                                        <button onclick="removerUsuario('${u.nick}', '${cargo}')" style="background: #ff4757; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; margin: 2px;">REMOVER ${cargo === 'desenvolvedor' ? 'DEV' : cargo === 'presidencia' ? 'Pres.DIR' : cargo === 'diretoria' ? 'DIR' : 'EI'}</button>
                                    `).join('')}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            `;

            if (todosUsuarios.length === 0) {
                usersList.innerHTML = '<div style="color:#888;text-align:center;padding:20px 0;">Nenhum usuário autorizado</div>';
            }
        }

        async function aprovarSolicitacao(nick) {
            await processarSolicitacao(nick, 'aprovada');
        }

        function abrirModalReprovar(nick) {
            reprovarNick = nick;
            document.getElementById('reprovar-modal-overlay').style.display = 'flex';
            document.getElementById('reprovar-motivo').value = '';
        }

        function fecharModalReprovar() {
            document.getElementById('reprovar-modal-overlay').style.display = 'none';
            reprovarNick = '';
        }

        async function confirmarReprovar() {
            const motivo = document.getElementById('reprovar-motivo').value.trim();
            if (!motivo) {
                showToast('Digite um motivo para reprovar!', 'warning');
                return;
            }

            await processarSolicitacao(reprovarNick, 'reprovada', motivo);
            fecharModalReprovar();
        }

        async function removerUsuario(nick, cargo) {
            const confirmado = await modalConfirm(`Remover ${nick} do cargo ${cargo}?`);
            if (confirmado) {
                await gerenciarCargo(nick, cargo, 'remover');
            }
        }

        function openProfile(user) {
            state.profile.user = user;
            state.profile.page = 1;
            document.getElementById('dashboard-page').classList.add('hidden');
            document.getElementById('search-page').classList.add('hidden');
            document.getElementById('info-page').classList.add('hidden');
            document.getElementById('profile-page').classList.remove('hidden');
            document.getElementById('admin-panel-page').classList.add('hidden');
            ['menu-dashboard', 'menu-search', 'menu-info', 'menu-admin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });
            const headerCard = document.getElementById('header-profile-card');
            if (headerCard) headerCard.classList.add('active');
            setHeaderTitle(user);
            fixLayoutWidthToHeader('profile-page');
            renderProfileSidebar();
            renderProfileFeed();
            renderProfilePagination();
        }

        function openAdminPanel() {
            document.getElementById('dashboard-page').classList.add('hidden');
            document.getElementById('search-page').classList.add('hidden');
            document.getElementById('info-page').classList.add('hidden');
            document.getElementById('profile-page').classList.add('hidden');
            document.getElementById('admin-panel-page').classList.remove('hidden');
            ['menu-dashboard', 'menu-search', 'menu-info'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });
            const menuAdmin = document.getElementById('menu-admin');
            if (menuAdmin) menuAdmin.classList.add('active');
            const drawerMenuAdmin = document.getElementById('drawer-menu-admin');
            if (drawerMenuAdmin) drawerMenuAdmin.classList.add('active');
            const headerCard = document.getElementById('header-profile-card');
            if (headerCard) headerCard.classList.remove('active');
            setHeaderTitle('PAINEL DE CONTROLE');
            renderAdminPanel();
        }

        function modalConfirm(message) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.style.display = 'flex';
                overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">CONFIRMAÇÃO</div>
                <div class="modal-body">${message}</div>
                <div class="modal-actions">
                    <button id="confirm-cancel" class="btn">Cancelar</button>
                    <button id="confirm-ok" class="btn btn-primary">Confirmar</button>
                </div>
            </div>
        `;
                document.body.appendChild(overlay);
                overlay.querySelector('#confirm-cancel').onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(false);
                };
                overlay.querySelector('#confirm-ok').onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(true);
                };
            });
        }

        function openModal(type) {
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const submitEl = document.getElementById('modal-submit');

            submitEl.onclick = null;

            if (type === 'new-executive') {
                titleEl.textContent = 'REGISTRAR/EXCLUIR EXECUTIVO';
                bodyEl.innerHTML = `
            <div class="form-row">
                <div class="form-label">NICK DO EXECUTIVO</div>
                <input id="exec-nick" class="form-input" placeholder="NICKNAME">
            </div>
            <div class="form-row">
                <div class="form-label">AÇÃO</div>
                <select id="exec-ops" class="form-select">
                    <option value="register">Registrar</option>
                    <option value="delete">Excluir</option>
                </select>
            </div>
        `;

                submitEl.onclick = async () => {
                    const nick = document.getElementById('exec-nick').value.trim();
                    const op = document.getElementById('exec-ops').value;

                    if (!nick) {
                        showToast('Por favor, insira um nick!', 'warning');
                        return;
                    }

                    if (op === 'register') {
                        await registrarExecutivo(nick, USUARIO_ATUAL);
                    } else {
                        await excluirExecutivo(nick, USUARIO_ATUAL);
                    }

                    closeModal();
                };

            } else if (type === 'post-report') {
                titleEl.textContent = 'POSTAR RELATÓRIO';
                bodyEl.innerHTML = `
            <div class="form-row">
                <div class="form-label">AUTOR</div>
                <input id="rep-author" class="form-input" value="${state.profile.user || USUARIO_ATUAL}" placeholder="Autor">
            </div>
            <div class="form-row">
                <div class="form-label">EXECUTIVO</div>
                <input id="rep-target" class="form-input" placeholder="Nick do executivo">
            </div>
            <div id="rep-print-controls" class="form-row">
                <div class="form-label">PRINT</div>
                <button type="button" id="add-print-btn" class="btn">Adicionar print?</button>
            </div>
            <div id="rep-print-row" class="form-row hidden">
                <div class="form-label">PRINT URL</div>
                <input id="rep-print" class="form-input" placeholder="https://i.imgur.com/...">
                <button type="button" id="remove-print-btn" class="btn" title="Remover">×</button>
            </div>
            <div class="form-row">
                <div class="form-label">DETALHES</div>
                <textarea id="rep-text" class="form-textarea" placeholder="Descreva o que aconteceu..." rows="4"></textarea>
            </div>
        `;

                const addBtn = document.getElementById('add-print-btn');
                const removeBtn = document.getElementById('remove-print-btn');
                const printRow = document.getElementById('rep-print-row');
                const printControls = document.getElementById('rep-print-controls');

                addBtn.onclick = () => {
                    printRow.classList.remove('hidden');
                    printControls.classList.add('hidden');
                    document.getElementById('rep-print').focus();
                };

                removeBtn.onclick = () => {
                    printRow.classList.add('hidden');
                    printControls.classList.remove('hidden');
                    document.getElementById('rep-print').value = '';
                };

                submitEl.onclick = async () => {
                    const author = document.getElementById('rep-author').value.trim();
                    const target = document.getElementById('rep-target').value.trim();
                    const text = document.getElementById('rep-text').value.trim();
                    const print = document.getElementById('rep-print').value.trim();

                    if (!author || !target || !text) {
                        showToast('Preencha autor, destinatário e texto!', 'warning');
                        return;
                    }

                    await postarRelatorio(author, target, text, print);
                    closeModal();
                };

            } else if (type === 'update-info') {
                titleEl.textContent = 'ATUALIZAR INFORMAÇÕES';
                bodyEl.innerHTML = `
                    <div class="form-row">
                        <div class="form-label">NICK DO EXECUTIVO</div>
                        <div class="autocomplete-container">
                            <input id="upd-nick" class="form-input" placeholder="Digite o nickname..." autocomplete="off">
                            <div id="autocomplete-list-upd" class="autocomplete-list"></div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">NOVO STATUS</div>
                        <select id="upd-status" class="form-select">
                            <option value="Livre">Livre</option>
                            <option value="Acompanhado/Auxiliado">Acompanhado/Auxiliado</option>
                            <option value="Não tem interesse">Não tem interesse</option>
                        </select>
                    </div>
                `;

                const nickInput = document.getElementById('upd-nick');
                const autocompleteList = document.getElementById('autocomplete-list-upd');

                nickInput.addEventListener('input', function () {
                    const query = this.value.toLowerCase();
                    autocompleteList.innerHTML = '';

                    if (query.length < 1) {
                        autocompleteList.style.display = 'none';
                        return;
                    }

                    const filtered = DADOS.usuarios.filter(user =>
                        user.nick.toLowerCase().includes(query)
                    ).slice(0, 8);

                    if (filtered.length === 0) {
                        autocompleteList.style.display = 'none';
                        return;
                    }

                    filtered.forEach(user => {
                        const item = document.createElement('div');
                        item.className = 'autocomplete-item';
                        item.textContent = user.nick;
                        item.onclick = () => {
                            nickInput.value = user.nick;
                            autocompleteList.style.display = 'none';
                        };
                        autocompleteList.appendChild(item);
                    });

                    autocompleteList.style.display = 'block';
                });

                document.addEventListener('click', function (e) {
                    if (!nickInput.contains(e.target) && !autocompleteList.contains(e.target)) {
                        autocompleteList.style.display = 'none';
                    }
                });

                submitEl.onclick = async () => {
                    const nick = document.getElementById('upd-nick').value.trim();
                    const status = document.getElementById('upd-status').value;

                    if (!nick) {
                        showToast('Por favor, insira um nick!', 'warning');
                        return;
                    }

                    await atualizarStatusExecutivo(nick, status, USUARIO_ATUAL);
                    closeModal();
                };
            } else if (type === 'manage-roles') {
                const cargo = verificarAcesso();
                if (cargo !== 'desenvolvedor' && cargo !== 'presidencia') {
                    showToast('Apenas a Presidência gerenciar cargos!', 'error');
                    return;
                }

                titleEl.textContent = 'GERENCIAR CARGOS';
                bodyEl.innerHTML = `
            <div class="form-row">
                <div class="form-label">Nick</div>
                <div class="autocomplete-container">
                    <input id="role-nick" class="form-input" placeholder="Digite o nickname..." autocomplete="off">
                    <div id="autocomplete-list" class="autocomplete-list"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-label">Cargo</div>
                <select id="role-cargo" class="form-select">
                    <option value="desenvolvedor">Desenvolvedor</option>
                    <option value="presidencia">Presidência Diretoria</option>
                    <option value="diretoria">Diretoria</option>
                    <option value="intermediaria">Especialização Intermediária</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-label">Ação</div>
                <select id="role-acao" class="form-select">
                    <option value="adicionar">Adicionar</option>
                    <option value="remover">Remover</option>
                </select>
            </div>
        `;
            const nickInput = document.getElementById('role-nick');
        const autocompleteList = document.getElementById('autocomplete-list');

        nickInput.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            autocompleteList.innerHTML = '';

            if (query.length < 1) {
                autocompleteList.style.display = 'none';
                return;
            }

            const todosUsuariosAprovados = [
                ...DADOS.acessos.desenvolvedor,
                ...DADOS.acessos.presidencia,
                ...DADOS.acessos.diretoria,
                ...DADOS.acessos.intermediaria
            ];

            const filtered = todosUsuariosAprovados.filter(nick =>
                nick.toLowerCase().includes(query)
            ).slice(0, 8);

            if (filtered.length === 0) {
                autocompleteList.style.display = 'none';
                return;
            }

            filtered.forEach(nick => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = nick;
                item.onclick = () => {
                    nickInput.value = nick;
                    autocompleteList.style.display = 'none';
                };
                autocompleteList.appendChild(item);
            });

            autocompleteList.style.display = 'block';
        });

        document.addEventListener('click', function (e) {
            if (!nickInput.contains(e.target) && !autocompleteList.contains(e.target)) {
                autocompleteList.style.display = 'none';
            }
        });

        submitEl.onclick = async () => {
            const nick = document.getElementById('role-nick').value.trim();
            const cargo = document.getElementById('role-cargo').value;
            const acao = document.getElementById('role-acao').value;

            if (!nick) {
                showToast('Por favor, insira um nick!', 'warning');
                return;
            }

                await gerenciarCargo(nick, cargo, acao);
                closeModal();
            };
        }
            overlay.style.display = 'flex';
            document.getElementById('modal-cancel').onclick = closeModal;
        }

        function closeModal() {
            const overlay = document.getElementById('modal-overlay');
            overlay.style.display = 'none';
            const autocompleteList = document.getElementById('autocomplete-list');
            if (autocompleteList) autocompleteList.style.display = 'none';
            const autocompleteListUpd = document.getElementById('autocomplete-list-upd');
            if (autocompleteListUpd) autocompleteListUpd.style.display = 'none';
        }

        function switchPage(pageId) {
            document.getElementById('dashboard-page').classList.add('hidden');
            document.getElementById('search-page').classList.add('hidden');
            document.getElementById('info-page').classList.add('hidden');
            document.getElementById('profile-page').classList.add('hidden');
            document.getElementById('admin-panel-page').classList.add('hidden');
            ['menu-dashboard', 'menu-search', 'menu-info', 'menu-admin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });
            const drawerMenuAdmin = document.getElementById('drawer-menu-admin');
            if (drawerMenuAdmin) drawerMenuAdmin.classList.remove('active');
            const headerCard = document.getElementById('header-profile-card');
            if (headerCard) headerCard.classList.remove('active');
            if (pageId === 'dashboard') {
                document.getElementById('dashboard-page').classList.remove('hidden');
                document.getElementById('menu-dashboard')?.classList.add('active');
                setHeaderTitle('CONTROLE DE INFORMAÇÕES');
            } else if (pageId === 'search') {
                document.getElementById('search-page').classList.remove('hidden');
                fixLayoutWidthToHeader('search-page');
                document.getElementById('menu-search')?.classList.add('active');
                setHeaderTitle('POSTAGENS');
            } else if (pageId === 'info') {
                document.getElementById('info-page').classList.remove('hidden');
                fixLayoutWidthToHeader('info-page');
                document.getElementById('menu-info')?.classList.add('active');
                setHeaderTitle('INFORMAÇÕES');
            }
        }
        function setHeaderTitle(text) {
            const el = document.getElementById('header-title');
            if (el) el.textContent = text;
        }
        function initSearch(mode) {
            const input = document.getElementById(`nickname-input-${mode}`);
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    state[mode].filter = input.value;
                    state[mode].page = 1;
                    renderFeed(mode); renderPagination(mode); renderProfile(mode);
                }
            });
        }

        function fixLayoutWidthToHeader(pageId) {
            const headerEl = document.querySelector('header');
            const layout = document.querySelector(`#${pageId} .search-layout`);
            const sidebar = document.querySelector(`#${pageId} .profile-sidebar`);
            const feed = document.querySelector(`#${pageId} .feed-container`);
            if (!headerEl || !layout || !sidebar || !feed) return;
            if (window.innerWidth <= 1024) {
                layout.style.width = '';
                feed.style.flex = '';
                feed.style.width = '';
                return;
            }
            const headerWidth = Math.round(headerEl.getBoundingClientRect().width);
            layout.style.width = `${headerWidth}px`;
            const gapPx = 30;
            const feedWidth = Math.max(0, headerWidth - sidebar.offsetWidth - gapPx);
            feed.style.flex = 'none';
            feed.style.width = `${Math.round(feedWidth)}px`;
        }

        function atualizarPerfilInterface() {
            const headerProfileName = document.getElementById('header-profile-name');
            const headerProfileAvatar = document.getElementById('header-profile-avatar');
            const headerProfileRole = document.getElementById('header-profile-role');
            const drawerProfileName = document.getElementById('drawer-profile-name');
            const drawerProfileAvatar = document.getElementById('drawer-profile-avatar');
            const drawerProfileRole = document.getElementById('drawer-profile-role');

            const nickLower = USUARIO_ATUAL.toLowerCase();
            const cargos = [];

            if (DADOS.acessos.desenvolvedor.includes(nickLower)) cargos.push('DEV');
            if (DADOS.acessos.presidencia.includes(nickLower)) cargos.push('Pres.DIR');
            if (DADOS.acessos.diretoria.includes(nickLower)) cargos.push('DIR');
            if (DADOS.acessos.intermediaria.includes(nickLower)) cargos.push('EI');

            const cargoTexto = cargos.length > 0 ? cargos.join('/') : 'Executivo';
            const cargoClass = cargos.includes('DEV') ? 'desenvolvedor' :
                            cargos.includes('Pres.DIR') ? 'presidencia' :
                            cargos.includes('DIR') ? 'dir' :
                            cargos.includes('EI') ? 'ei' : '';

            if (headerProfileName) headerProfileName.textContent = USUARIO_ATUAL;
            if (drawerProfileName) drawerProfileName.textContent = USUARIO_ATUAL;
            if (headerProfileRole) {
                headerProfileRole.textContent = cargoTexto;
                headerProfileRole.className = 'profile-sub ' + cargoClass;
            }
            if (drawerProfileRole) {
                drawerProfileRole.textContent = cargoTexto;
                drawerProfileRole.className = 'profile-sub ' + cargoClass;
            }
            if (headerProfileAvatar) headerProfileAvatar.src = avatarUrl(USUARIO_ATUAL);
            if (drawerProfileAvatar) drawerProfileAvatar.src = avatarUrl(USUARIO_ATUAL);
        }

        function iniciarAtualizacaoAutomatica() {
            let ultimaAtualizacao = new Date().toISOString();
            let contadorErros = 0;
            const INTERVALO_MS = 2000;

            async function verificarAtualizacoes() {
                try {
                    const resposta = await fetch(GIST_URL + '?timestamp=' + Date.now(), {
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        cache: 'no-store'
                    });

                    if (!resposta.ok) throw new Error(`Erro: ${resposta.status}`);

                    const gist = await resposta.json();
                    const conteudo = gist.files['data.json']?.content;

                    if (conteudo) {
                        const dadosRemotos = JSON.parse(conteudo);
                        const dadosRemotosString = JSON.stringify(dadosRemotos);
                        const dadosLocaisString = JSON.stringify(DADOS);

                        if (dadosRemotosString !== dadosLocaisString) {
                            DADOS = dadosRemotos;
                            ultimaAtualizacao = new Date().toISOString();
                            contadorErros = 0;

                            atualizarInterfaceAcesso();

                            if (!document.getElementById('admin-panel-page').classList.contains('hidden')) {
                                renderAdminPanel();
                            }

                            atualizarNotificacoes();
                        }
                    }
                } catch (erro) {
                    console.error('Erro na verificação automática:', erro);
                    contadorErros++;
                    if (contadorErros > 5) {
                        console.warn('Muitos erros consecutivos, pausando verificação...');
                        clearInterval(intervalo);
                        setTimeout(iniciarAtualizacaoAutomatica, 30000);
                    }
                }
            }

            const intervalo = setInterval(verificarAtualizacoes, INTERVALO_MS);
            return intervalo;
        }

        async function init() {
            const username = await pegarUsername();
            USUARIO_ATUAL = username || null;

            await carregarDados();

            iniciarAtualizacaoAutomatica();

            if (temAcesso()) {
                atualizarPerfilInterface();

                ['posts', 'info'].forEach(mode => {
                    renderFeed(mode);
                    renderPagination(mode);
                    renderProfile(mode);
                    initSearch(mode);
                });

                fixLayoutWidthToHeader('search-page');
                fixLayoutWidthToHeader('info-page');
                fixLayoutWidthToHeader('profile-page');

                const headerCard = document.getElementById('header-profile-card');
                if (headerCard) {
                    headerCard.addEventListener('click', () => {
                        openProfile(USUARIO_ATUAL);
                    });
                }

                const drawer = document.getElementById('side-drawer');
                const overlay = document.getElementById('drawer-overlay');
                const openBtn = document.getElementById('hamburger-btn');
                const openBtnMobile = document.getElementById('mobile-hamburger');
                const closeBtn = document.getElementById('drawer-close');

                function openDrawer() {
                    overlay.style.display = 'block';
                    drawer.style.transform = 'translateX(0)';
                    document.body.style.overflow = 'hidden';
                    openBtn?.classList.add('hidden');
                    openBtnMobile?.classList.add('hidden');
                }

                function closeDrawer() {
                    drawer.style.transform = 'translateX(-100%)';
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                    openBtn?.classList.remove('hidden');
                    openBtnMobile?.classList.remove('hidden');
                }

                openBtn?.addEventListener('click', openDrawer);
                openBtnMobile?.addEventListener('click', openDrawer);
                closeBtn?.addEventListener('click', closeDrawer);
                overlay?.addEventListener('click', closeDrawer);

                document.querySelectorAll('#side-drawer .menu-item').forEach(mi => {
                    mi.addEventListener('click', () => closeDrawer());
                });

                document.getElementById('drawer-profile-card')?.addEventListener('click', () => {
                    closeDrawer();
                    openProfile(USUARIO_ATUAL);
                });

                document.getElementById('menu-dashboard')?.classList.add('active');
                document.getElementById('btn-new-executive')?.addEventListener('click', () => openModal('new-executive'));
                document.getElementById('btn-post-report')?.addEventListener('click', () => openModal('post-report'));
                document.getElementById('btn-update-info')?.addEventListener('click', () => openModal('update-info'));

                document.addEventListener('input', function (e) {
                    if (e.target && e.target.id === 'admin-search-users') {
                        const query = e.target.value.toLowerCase();
                        const userItems = document.querySelectorAll('#admin-users-list > div');

                        userItems.forEach(item => {
                            const nickDiv = item.querySelector('div > div:first-child');
                            if (nickDiv) {
                                const nick = nickDiv.textContent.toLowerCase();
                                item.style.display = nick.includes(query) ? '' : 'none';
                            }
                        });
                    }
                });

                document.getElementById('current-year').textContent = new Date().getFullYear();
            }
            document.getElementById('auth-submit-btn').addEventListener('click', async () => {
                const nick = document.getElementById('auth-nickname').value.trim();

                if (!nick) {
                    showToast('Por favor, insira seu nickname!', 'warning');
                    return;
                }

                await solicitarAcesso(nick);
            });
            document.getElementById('reprovar-cancelar').addEventListener('click', fecharModalReprovar);
            document.getElementById('reprovar-confirmar').addEventListener('click', confirmarReprovar);
        }
        document.addEventListener('DOMContentLoaded', () => { init(); });