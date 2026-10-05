const STORAGE_KEY = 'vozes-sesi-publications-v1';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_VIDEO_DURATION = 180;
const THEME_KEY = 'vozes-sesi-theme-v1';
let posts = loadPosts();
let selectedImage = '';
let selectedMediaType = 'image';
let selectedMediaFile = null;
let mediaPreviewUrl = '';
let editingPostId = null;
let isAdmin = false;
let isStudentLoggedIn = false;
let deleteTargetId = null;

function setStudentLoginModal(open) {
  const modal = document.querySelector('#student-login-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (open) window.setTimeout(() => document.querySelector('#student-login').focus(), 50);
}

function requestPostForm() {
  if (isStudentLoggedIn) setModal(true);
  else {
    document.querySelector('#student-login-error').textContent = '';
    document.querySelector('#student-login-form').reset();
    setStudentLoginModal(true);
  }
}

function openReadingView(postId) {
  const post = posts.find((item) => item.id === postId);
  if (!post) return;
  const media = document.querySelector('#reading-media');
  if (post.type === 'video' && post.image) {
    media.innerHTML = `<video src="${escapeHtml(post.image)}" controls playsinline autoplay></video>`;
  } else if (post.image) {
    media.innerHTML = `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />`;
  } else {
    media.innerHTML = '';
  }
  document.querySelector('#reading-date').textContent = `◷ ${post.date}`;
  document.querySelector('#reading-author').textContent = post.author;
  document.querySelector('#reading-title').textContent = post.title;
  document.querySelector('#reading-description').textContent = post.description;
  const modal = document.querySelector('#reading-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeReadingView() {
  const modal = document.querySelector('#reading-modal');
  const video = modal.querySelector('video');
  if (video) video.pause();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.querySelector('#reading-media').innerHTML = '';
  document.body.classList.remove('modal-open');
}

function loadPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderPosts(query = '') {
  const grid = document.querySelector('#post-grid');
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const matchingPosts = posts.filter((post) => `${post.title} ${post.description} ${post.author}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery));
  document.querySelector('#post-count').textContent = String(posts.length).padStart(2, '0');

  if (!matchingPosts.length) {
    grid.innerHTML = normalizedQuery
      ? '<div class="empty-state"><span>âŒ•</span><h3>Nenhuma publicaÃ§Ã£o encontrada.</h3><p>Tente buscar outro termo.</p></div>'
      : '<div class="empty-state"><span>âœ³</span><h3>A conversa comeÃ§a com vocÃª.</h3><p>Compartilhe uma ideia, uma descoberta ou algo que te inspira.</p><button class="empty-button" data-open-form>ï¼‹ Criar a primeira publicaÃ§Ã£o</button></div>';
    return;
  }

  grid.innerHTML = matchingPosts.map((post, index) => `
    <article class="post-card ${index === 0 ? 'featured' : ''}" data-post-id="${escapeHtml(post.id)}" role="button" tabindex="0" aria-label="Abrir publica??o: ${escapeHtml(post.title)}">
      <div class="post-image ${post.image ? '' : 'no-image'}" style="${post.type === 'video' ? '' : post.image ? `background-image:url('${post.image}')` : ''}">
        ${post.type === 'video' ? `<video src="${escapeHtml(post.image)}" controls playsinline preload="metadata" aria-label="VÃ­deo: ${escapeHtml(post.title)}"></video>` : post.image ? '' : `<div class="image-placeholder"><span>âœ³</span><small>UMA IDEIA<br />EM MOVIMENTO</small></div>`}
        <span class="post-category">VOZ ESTUDANTIL</span>
      </div>
      <div class="post-body">
        <div class="post-meta"><span class="post-date"><span>â—·</span> ${escapeHtml(post.date)}</span><span class="post-author"><span class="author-avatar">${escapeHtml(post.author.trim().charAt(0).toLocaleUpperCase('pt-BR'))}</span> ${escapeHtml(post.author)}</span></div>
        <h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p>
        <div class="post-footer"><span>VOZES DO SESI</span><span>â†—</span></div>
        ${isAdmin ? `<div class="admin-post-actions"><button type="button" data-edit-post="${escapeHtml(post.id)}">Editar</button><button type="button" data-delete-post="${escapeHtml(post.id)}">Remover</button></div>` : ''}
      </div>
    </article>`).join('');
}

function setModal(open) {
  const modal = document.querySelector('#post-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('modal-open', open);
  if (open) {
    if (!editingPostId) resetPostForm();
    document.querySelector('#today-date').textContent = localDate();
    window.setTimeout(() => document.querySelector('#post-author').focus(), 50);
  }
}

function setAdminModal(open) {
  const modal = document.querySelector('#admin-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (open) window.setTimeout(() => document.querySelector('#admin-login').focus(), 50);
}

function setDeleteModal(open) {
  const modal = document.querySelector('#delete-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
}

function updateAdminButton() {
  const button = document.querySelector('#admin-button');
  button.textContent = isAdmin ? 'Sair do admin' : 'Admin';
  button.classList.toggle('logged-in', isAdmin);
}

function setTheme(isDark) {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  const toggle = document.querySelector('#theme-toggle');
  toggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
  toggle.title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
  document.querySelector('#theme-icon').textContent = isDark ? '☀' : '☾';
  document.querySelector('.theme-label').textContent = isDark ? 'Modo claro' : 'Modo escuro';
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#171615' : '#ed1c24';
}

document.querySelector('#theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme !== 'dark';
  setTheme(isDark);
  try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch {}
});

try { setTheme(localStorage.getItem(THEME_KEY) === 'dark'); } catch { setTheme(false); }

function resetPostForm() {
  document.querySelector('#post-form').reset();
  document.querySelector('#char-count').textContent = '0';
  document.querySelector('#photo-drop').classList.remove('has-image', 'has-video');
  document.querySelector('#image-preview').src = '';
  selectedImage = '';
  selectedMediaType = 'image';
  selectedMediaFile = null;
  if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
  mediaPreviewUrl = '';
  document.querySelector('#video-preview').pause();
  document.querySelector('#video-preview').removeAttribute('src');
  document.querySelector('#video-preview').load();
  updateMediaInput();
  editingPostId = null;
  document.querySelector('#modal-title').textContent = 'Compartilhe sua ideia.';
  document.querySelector('#post-modal .section-eyebrow').textContent = 'SUA VOZ FAZ PARTE';
  document.querySelector('#post-modal .submit-button').innerHTML = 'Publicar no blog <span>â†—</span>';
  document.querySelector('#post-image').required = false;
}

function updateMediaInput() {
  const input = document.querySelector('#post-image');
  input.accept = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime';
  document.querySelector('#media-prompt').textContent = 'Escolha uma foto ou vídeo para sua publicação';
  document.querySelector('#media-help').textContent = 'Fotos até 5 MB · vídeos até 3 minutos e 500 MB';
  input.required = false;
  input.value = '';
  selectedMediaFile = null;
  document.querySelector('#photo-drop').classList.remove('has-image', 'has-video');
  document.querySelector('#image-preview').src = '';
  const video = document.querySelector('#video-preview');
  video.pause();
  video.removeAttribute('src');
  video.load();
  if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
  mediaPreviewUrl = '';
}

function openEditPost(id) {
  if (!isAdmin) return;
  const post = posts.find((item) => item.id === id);
  if (!post) return;
  editingPostId = id;
  selectedImage = post.image || '';
  selectedMediaType = post.type === 'video' ? 'video' : 'image';
  updateMediaInput();
  selectedImage = post.image || '';
  document.querySelector('#post-author').value = post.author;
  document.querySelector('#post-title').value = post.title;
  document.querySelector('#post-description').value = post.description;
  document.querySelector('#char-count').textContent = String(post.description.length);
  document.querySelector('#today-date').textContent = post.date;
  document.querySelector('#modal-title').textContent = 'Editar publicaÃ§Ã£o.';
  document.querySelector('#post-modal .section-eyebrow').textContent = 'EDIÃ‡ÃƒO DO ADMIN';
  document.querySelector('#post-modal .submit-button').innerHTML = 'Salvar alteraÃ§Ãµes <span>â†—</span>';
  document.querySelector('#post-image').required = false;
  const drop = document.querySelector('#photo-drop');
  drop.classList.toggle(selectedMediaType === 'video' ? 'has-video' : 'has-image', Boolean(post.image));
  if (selectedMediaType === 'video') document.querySelector('#video-preview').src = post.image || '';
  else document.querySelector('#image-preview').src = post.image || '';
  setModal(true);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('click', (event) => {
  const postCard = event.target.closest('[data-post-id]');
  if (postCard && !event.target.closest('button, video, a')) {
    openReadingView(postCard.dataset.postId);
    return;
  }
  if (event.target.closest('[data-close-reading]') || event.target.id === 'reading-modal') {
    closeReadingView();
    return;
  }
  if (event.target.closest('[data-open-form]')) requestPostForm();
  if (event.target.closest('[data-close]')) {
    setModal(false);
    setAdminModal(false);
    setStudentLoginModal(false);
  }
  if (event.target.id === 'post-modal') setModal(false);
  if (event.target.id === 'admin-modal') setAdminModal(false);
  if (event.target.id === 'student-login-modal') setStudentLoginModal(false);
  const editButton = event.target.closest('[data-edit-post]');
  if (editButton) openEditPost(editButton.dataset.editPost);
  const deleteButton = event.target.closest('[data-delete-post]');
  if (deleteButton && isAdmin) {
    deleteTargetId = deleteButton.dataset.deletePost;
    setDeleteModal(true);
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.post-card[data-post-id]')) {
    event.preventDefault();
    openReadingView(event.target.dataset.postId);
  }
  if (event.key === 'Escape') {
    setModal(false);
    setAdminModal(false);
    setStudentLoginModal(false);
    closeReadingView();
    setDeleteModal(false);
  }
});

document.querySelector('#student-login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#student-login').value.trim();
  const password = document.querySelector('#student-password').value;
  if (username !== 'aluno' || password !== 'aluno123') {
    document.querySelector('#student-login-error').textContent = 'Login ou senha incorretos.';
    return;
  }
  isStudentLoggedIn = true;
  setStudentLoginModal(false);
  setModal(true);
});

document.querySelector('#admin-button').addEventListener('click', () => {
  if (isAdmin) {
    isAdmin = false;
    updateAdminButton();
    renderPosts(document.querySelector('#search-posts').value);
    showToast('VocÃª saiu do painel de administraÃ§Ã£o.');
    return;
  }
  document.querySelector('#login-error').textContent = '';
  document.querySelector('#admin-form').reset();
  setAdminModal(true);
});

document.querySelector('#admin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const login = document.querySelector('#admin-login').value;
  const password = document.querySelector('#admin-password').value;
  if (login !== 'admin' || password !== 'admin123') {
    document.querySelector('#login-error').textContent = 'Login ou senha incorretos.';
    return;
  }
  isAdmin = true;
  updateAdminButton();
  setAdminModal(false);
  renderPosts(document.querySelector('#search-posts').value);
  showToast('Painel de administraÃ§Ã£o aberto.');
});

document.querySelector('#cancel-delete').addEventListener('click', () => {
  deleteTargetId = null;
  setDeleteModal(false);
});

document.querySelector('#delete-modal').addEventListener('click', (event) => {
  if (event.target.id === 'delete-modal') {
    deleteTargetId = null;
    setDeleteModal(false);
  }
});

document.querySelector('#confirm-delete').addEventListener('click', () => {
  if (!isAdmin || !deleteTargetId) return;
  const previousPosts = posts;
  posts = posts.filter((post) => post.id !== deleteTargetId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    posts = previousPosts;
    showToast('NÃ£o foi possÃ­vel salvar a alteraÃ§Ã£o.');
    return;
  }
  deleteTargetId = null;
  setDeleteModal(false);
  renderPosts(document.querySelector('#search-posts').value);
  showToast('PublicaÃ§Ã£o removida.');
});

document.querySelector('#search-posts').addEventListener('input', (event) => renderPosts(event.target.value));

document.querySelector('#post-description').addEventListener('input', (event) => {
  document.querySelector('#char-count').textContent = String(event.target.value.length);
});

document.querySelector('#post-image').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  selectedMediaFile = file;
  selectedMediaType = file.type.startsWith('video/') ? 'video' : 'image';
  if (selectedMediaType === 'video') {
    if (!['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type)) {
      showToast('Escolha um vÃ­deo MP4, WEBM ou MOV.');
      event.target.value = '';
      selectedMediaFile = null;
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      showToast('O vÃ­deo deve ter atÃ© 500 MB.');
      event.target.value = '';
      selectedMediaFile = null;
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const video = document.querySelector('#video-preview');
    video.src = objectUrl;
    mediaPreviewUrl = objectUrl;
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration > MAX_VIDEO_DURATION) {
        showToast('O vÃ­deo deve ter no mÃ¡ximo 3 minutos.');
        event.target.value = '';
        selectedMediaFile = null;
        selectedImage = '';
        video.removeAttribute('src');
        video.load();
        document.querySelector('#photo-drop').classList.remove('has-video');
        URL.revokeObjectURL(objectUrl);
        mediaPreviewUrl = '';
        return;
      }
      selectedImage = 'validated-video';
      document.querySelector('#photo-drop').classList.add('has-video');
    };
    video.onerror = () => {
      showToast('NÃ£o foi possÃ­vel ler este vÃ­deo. Tente outro arquivo.');
      event.target.value = '';
      selectedMediaFile = null;
      selectedImage = '';
    };
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('Escolha uma imagem JPG, PNG ou WEBP.');
    event.target.value = '';
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    showToast('A imagem deve ter atÃ© 5 MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedImage = String(reader.result);
    const drop = document.querySelector('#photo-drop');
    drop.classList.add('has-image');
    document.querySelector('#image-preview').src = selectedImage;
  };
  reader.readAsDataURL(file);
});

document.querySelector('#post-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const previousPosts = posts;
  const newPost = {
    id: editingPostId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    author: document.querySelector('#post-author').value.trim(),
    title: document.querySelector('#post-title').value.trim(),
    description: document.querySelector('#post-description').value.trim(),
    image: selectedMediaFile ? '' : selectedImage || (editingPostId ? posts.find((post) => post.id === editingPostId)?.image : '') || '',
    type: selectedMediaType,
    date: editingPostId ? posts.find((post) => post.id === editingPostId)?.date || localDate() : localDate(),
    timestamp: editingPostId ? posts.find((post) => post.id === editingPostId)?.timestamp || Date.now() : Date.now(),
  };
  const completePost = (imageData) => {
    newPost.image = imageData || selectedImage || (editingPostId ? posts.find((post) => post.id === editingPostId)?.image : '') || '';
    savePost(newPost, previousPosts);
  };
  if (selectedMediaFile && selectedMediaType === 'video') {
    if (selectedImage !== 'validated-video') {
      showToast('Aguarde a prÃ©via do vÃ­deo carregar e tente novamente.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => completePost(String(reader.result));
    reader.onerror = () => showToast('NÃ£o foi possÃ­vel carregar o vÃ­deo.');
    reader.readAsDataURL(selectedMediaFile);
    return;
  }
  if (selectedMediaFile && selectedMediaType === 'image') {
    const reader = new FileReader();
    reader.onload = () => completePost(String(reader.result));
    reader.onerror = () => showToast('NÃ£o foi possÃ­vel carregar a imagem.');
    reader.readAsDataURL(selectedMediaFile);
    return;
  }
  completePost();
});

function savePost(newPost, previousPosts) {
  if (editingPostId && isAdmin) {
    posts = posts.map((post) => post.id === editingPostId ? { ...post, ...newPost, id: editingPostId } : post);
  } else {
    posts.unshift(newPost);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    posts = previousPosts;
    showToast('O armazenamento do navegador estÃ¡ cheio. Tente uma foto menor.');
    return;
  }
  renderPosts(document.querySelector('#search-posts').value);
  const wasEditing = Boolean(editingPostId);
  resetPostForm();
  setModal(false);
  document.querySelector('#publicacoes').scrollIntoView({ behavior: 'smooth' });
  showToast(wasEditing ? 'AlteraÃ§Ãµes salvas.' : 'PublicaÃ§Ã£o compartilhada. Valeu por participar!');
}

renderPosts();






