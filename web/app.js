'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = name => `<img src="assets/${name}.svg" alt="">`;
const pages = { home: 'Trang chủ', flowers: 'Phân loại hoa', detection: 'Phát hiện vật thể', retrieval: 'Truy hồi ảnh', chat: 'Chatbot RAG' };
// All scores, labels, boxes, and conversations below are fixed presentation samples.
const flowerSamples = [
  { name: 'Đồng tiền', file: 'hero.webp', label: 'Hoa đồng tiền', scores: [['Hoa đồng tiền', 94.6], ['Hoa cúc', 3.8], ['Hoa hướng dương', 1.6]] },
  { name: 'Anh túc', file: 'flowers.webp', label: 'Hoa anh túc', scores: [['Hoa anh túc', 91.7], ['Hoa tulip', 6.2], ['Hoa thủy tiên', 2.1]] },
];
const objects = [
  { label: 'Chó', score: 96.8, color: '#d5ed9b', box: [16, 36, 31, 59] },
  { label: 'Xe đạp', score: 92.4, color: '#f7c49e', box: [15, 23, 65, 52] },
  { label: 'Xe tải', score: 85.3, color: '#b4e0ec', box: [60, 13, 30, 27] },
];

function route() {
  const [requested, anchor] = location.hash.slice(1).split('/');
  if (requested === 'main') { $('#main').tabIndex = -1; $('#main').focus(); return; }
  const name = Object.hasOwn(pages, requested) ? requested : 'home';
  $$('[data-page]').forEach(page => { page.hidden = page.dataset.page !== name; });
  $$('.site-header nav a').forEach(link => {
    if (link.hash === `#${name}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${pages[name]} | AI Showcase`;
  const heading = $(`[data-page="${name}"] h1`);
  if (name === 'home' && anchor === 'about') {
    $('#about-heading').tabIndex = -1;
    $('#about-heading').focus({ preventScroll: true });
    $('#about').scrollIntoView();
  } else {
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function releasePreview(img) {
  if (img.dataset.previewUrl) URL.revokeObjectURL(img.dataset.previewUrl);
  delete img.dataset.previewUrl;
}

async function previewFile(file, input, image, error, onSuccess) {
  if (!file) return;
  const uploadId = String(Number(input.dataset.uploadId || 0) + 1);
  input.dataset.uploadId = uploadId;
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  image.setAttribute('aria-busy', 'true');
  let url;
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh vượt quá 10 MB. Vui lòng chọn tệp nhỏ hơn.');
    url = URL.createObjectURL(file);
    const probe = new Image();
    probe.src = url;
    await probe.decode();
    if (input.dataset.uploadId !== uploadId) { URL.revokeObjectURL(url); return; }
    releasePreview(image);
    image.src = url;
    image.dataset.previewUrl = url;
    image.hidden = false;
    onSuccess(file);
  } catch (err) {
    if (url) URL.revokeObjectURL(url);
    if (input.dataset.uploadId === uploadId) {
      error.textContent = err.name === 'EncodingError' ? 'Không thể đọc ảnh này. Vui lòng chọn một tệp ảnh hợp lệ.' : err.message;
      input.setAttribute('aria-invalid', 'true');
    }
  }
  if (input.dataset.uploadId === uploadId) image.removeAttribute('aria-busy');
  input.value = '';
}

function setupVision(name, model, title, subtitle) {
  const page = $(`[data-page="${name}"]`);
  page.innerHTML = `<div class="page-heading"><span class="model-tag">${model}</span><h1 tabindex="-1">${title}</h1><p>${subtitle}</p></div>
    <div class="preview-notice"><strong>Kết quả minh họa</strong><span>Nhãn và điểm số là dữ liệu mẫu. Ảnh bạn chọn chỉ được xem trong trình duyệt.</span></div>
    <div class="workspace-grid"><div class="panel input-panel"><div class="panel-heading"><h2>Ảnh đầu vào</h2><span id="${name}-image-type">Ảnh mẫu</span></div>
    <div class="image-stage" id="${name}-stage"><img id="${name}-image" alt="Ảnh đầu vào minh họa" width="768" height="576"></div>
    <div class="image-caption"><span id="${name}-filename"></span><span>Chỉ xem trước</span></div>
    <div class="upload-actions"><label class="button secondary upload-label">${icon('upload')} Chọn ảnh<input id="${name}-upload" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh để xem trước" aria-describedby="${name}-upload-help ${name}-error"></label><button class="button primary" id="${name}-reset" type="button">Xem mẫu ${icon('arrow-right')}</button></div>
    <p class="helper" id="${name}-upload-help">JPG, PNG hoặc WebP. Tối đa 10 MB. Có thể kéo ảnh vào khung.</p><p id="${name}-error" class="error" role="alert"></p>
    ${name === 'flowers' ? `<div class="sample-picker"><p>Chọn ảnh mẫu</p><div class="sample-buttons">${flowerSamples.map((sample, i) => `<button class="sample-button" type="button" data-flower="${i}" aria-pressed="${i === 0}"><img src="assets/${sample.file}" alt="">${sample.name}</button>`).join('')}</div></div>` : ''}</div>
    <div class="panel result-panel" id="${name}-results" role="status" aria-live="polite"></div></div>
    <p class="workspace-footnote">${name === 'flowers' ? 'Độ tin cậy không đảm bảo nhãn là chính xác. Khi trình bày, đối chiếu kết quả với ảnh đầu vào.' : 'Khung giới hạn, nhãn và điểm số giúp đọc kết quả phát hiện vật thể. Các khung ở đây được vẽ sẵn.'}</p>`;
  const input = $(`#${name}-upload`), image = $(`#${name}-image`), stage = $(`#${name}-stage`), error = $(`#${name}-error`);
  let custom = false;
  let currentSample = 0;
  let threshold = 35;
  let showLabels = true;

  function renderDetections() {
    $$('.detection-box', stage).forEach(box => box.remove());
    const visible = objects.filter(item => item.score >= threshold);
    visible.forEach(item => {
      const box = document.createElement('div');
      box.className = 'detection-box';
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = `--box-color:${item.color};left:${item.box[0]}%;top:${item.box[1]}%;width:${item.box[2]}%;height:${item.box[3]}%`;
      box.innerHTML = `<span>${item.label} ${item.score}%</span>`;
      stage.append(box);
    });
    stage.classList.toggle('hide-box-labels', !showLabels);
    $('#detection-count').textContent = `${visible.length} vật thể`;
    $('#detection-rows').innerHTML = visible.length ? visible.map(item => `<tr><td><span class="color-key" style="--box-color:${item.color}" aria-hidden="true"></span>${item.label}</td><td>${item.score}%</td></tr>`).join('') : '<tr><td colspan="2">Không có kết quả mẫu ở ngưỡng này. Hãy giảm ngưỡng.</td></tr>';
  }

  function renderResults() {
    const results = $(`#${name}-results`);
    if (custom) {
      $$('.detection-box', stage).forEach(box => box.remove());
      results.innerHTML = `<div class="empty-result"><span class="result-icon">${icon('image')}</span><h2>Ảnh đã sẵn sàng.</h2><p>Đây là giao diện minh họa nên không phân tích ảnh vừa chọn. Bấm <strong>Xem mẫu</strong> để khám phá cách kết quả được trình bày.</p></div>`;
      return;
    }
    if (name === 'flowers') {
      const sample = flowerSamples[currentSample];
      results.innerHTML = `<div class="panel-heading"><h2>Kết quả phân loại</h2><span>Dữ liệu mẫu</span></div><span class="result-icon">${icon('image')}</span><h3 class="result-title">${sample.label}</h3><p class="result-subtitle">Nhãn có điểm cao nhất trong ví dụ</p><div class="result-top-score">${sample.scores[0][1]}%</div><p class="score-caption">Độ tin cậy minh họa</p><div class="ranked-results"><h3>Các nhãn trong ví dụ</h3>${sample.scores.map(([label, score]) => `<div class="score-row"><div><span>${label}</span><span>${score}%</span></div><progress max="100" value="${score}" aria-label="${label}: ${score}% minh họa"></progress></div>`).join('')}</div><p class="model-note"><strong>ResNet-18</strong><br>Ví dụ cách trình bày nhãn và độ tin cậy. Danh sách nhãn chưa đại diện cho tập dữ liệu huấn luyện của nhóm.</p>`;
    } else {
      results.innerHTML = `<div class="panel-heading"><h2>Vật thể trong ảnh</h2><span>Dữ liệu mẫu</span></div><h3 class="detection-count" id="detection-count"></h3><p class="helper">Các khung và điểm số đã được đặt sẵn.</p><table class="detection-table"><thead><tr><th scope="col">Nhãn</th><th scope="col">Độ tin cậy mẫu</th></tr></thead><tbody id="detection-rows"></tbody></table><div class="detection-controls"><label class="range-label" for="confidence">Ngưỡng hiển thị <output id="confidence-value" for="confidence">${threshold}%</output></label><input id="confidence" type="range" min="0" max="100" value="${threshold}"><label class="checkbox-label"><input id="show-labels" type="checkbox" ${showLabels ? 'checked' : ''}>Hiện nhãn trên khung</label></div><p class="model-note"><strong>YOLO11n</strong><br>Thay đổi ngưỡng chỉ lọc các khung minh họa có sẵn.</p>`;
      $('#confidence').addEventListener('input', event => { threshold = Number(event.target.value); $('#confidence-value').textContent = `${threshold}%`; renderDetections(); });
      $('#show-labels').addEventListener('change', event => { showLabels = event.target.checked; renderDetections(); });
      renderDetections();
    }
  }

  function showSample(index = currentSample) {
    currentSample = index;
    custom = false;
    input.dataset.uploadId = String(Number(input.dataset.uploadId || 0) + 1);
    input.value = '';
    input.removeAttribute('aria-invalid');
    releasePreview(image);
    image.removeAttribute('aria-busy');
    image.src = name === 'flowers' ? `assets/${flowerSamples[index].file}` : 'assets/objects.webp';
    image.alt = name === 'flowers' ? `Ảnh minh họa ${flowerSamples[index].label.toLowerCase()}` : 'Chó, xe đạp và xe tải, với các khung minh họa';
    stage.classList.toggle('sample-flower', name === 'flowers');
    $(`#${name}-filename`).textContent = name === 'flowers' ? `Ảnh mẫu: ${flowerSamples[index].name}` : 'Ảnh mẫu: chó và xe đạp';
    $(`#${name}-image-type`).textContent = 'Ảnh mẫu';
    error.textContent = '';
    $$('[data-flower]', page).forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.flower) === index)));
    renderResults();
  }
  function upload(file) {
    previewFile(file, input, image, error, valid => {
      custom = true;
      stage.classList.remove('sample-flower');
      image.alt = 'Ảnh bạn đã chọn để xem trước';
      $(`#${name}-filename`).textContent = valid.name;
      $(`#${name}-image-type`).textContent = 'Ảnh của bạn';
      $$('[data-flower]', page).forEach(button => button.setAttribute('aria-pressed', 'false'));
      renderResults();
    });
  }
  input.addEventListener('change', () => upload(input.files[0]));
  stage.addEventListener('dragover', event => { event.preventDefault(); });
  stage.addEventListener('drop', event => { event.preventDefault(); upload(event.dataTransfer.files[0]); });
  $(`#${name}-reset`).addEventListener('click', () => showSample());
  $$('[data-flower]', page).forEach(button => button.addEventListener('click', () => showSample(Number(button.dataset.flower))));
  showSample();
}
setupVision('flowers', 'ResNet-18', 'Một bông hoa. <em>Một tên gọi.</em>', 'Xem trước ảnh và khám phá cách các nhãn phân loại được trình bày.');
setupVision('detection', 'YOLO11n', 'Trong ảnh <em>có những gì?</em>', 'Khám phá các khung giới hạn, nhãn và điểm tin cậy của từng vật thể.');

const gallerySets = {
  mountains: { title: 'Núi và hồ.', query: 'Núi và hồ giữa thiên nhiên', images: [['mountain.webp', 'Đỉnh núi', .87], ['lake.webp', 'Hồ giữa núi', .83], ['forest.webp', 'Rừng xanh', .72], ['desert.webp', 'Đồi cát', .65], ['hero.webp', 'Ảnh phong cảnh trên bàn', .58], ['flowers.webp', 'Hoa dưới nắng', .43]] },
  nature: { title: 'Một khoảng thiên nhiên.', query: 'Thiên nhiên và ánh nắng', images: [['forest.webp', 'Rừng xanh', .89], ['lake.webp', 'Mặt hồ', .84], ['mountain.webp', 'Đỉnh núi', .78], ['flowers.webp', 'Hoa dưới nắng', .74], ['desert.webp', 'Đồi cát', .63], ['rose.webp', 'Sắc hoa', .56]] },
  flowers: { title: 'Hoa và sắc màu.', query: 'Những bông hoa đầy sắc màu', images: [['hero.webp', 'Hoa đồng tiền', .88], ['flowers.webp', 'Hoa dưới nắng', .85], ['rose.webp', 'Bó hoa nhiều sắc màu', .81]] },
};
let gallerySet = 'mountains';
let queryMode = 'text';
let referenceReady = false;
function renderGallery() {
  const set = gallerySets[gallerySet];
  const items = [...set.images].sort((a, b) => $('#gallery-sort').value === 'name' ? a[1].localeCompare(b[1], 'vi') : b[2] - a[2]);
  $('#gallery-heading').textContent = set.title;
  $('#gallery-description').textContent = `${items.length} ảnh mẫu. Điểm tương đồng chỉ để minh họa.`;
  $('#retrieval-gallery').replaceChildren(...items.map(([file, name, score]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-card';
    card.setAttribute('aria-label', `Mở ảnh ${name}, điểm tương đồng mẫu ${score.toFixed(2)}`);
    card.innerHTML = `<div class="gallery-image"><img src="assets/${file}" alt="${name}" loading="lazy" width="1000" height="750"></div><div class="gallery-card-copy"><span>${name}</span><span class="similarity">Mẫu ${score.toFixed(2)}</span></div>`;
    card.addEventListener('click', () => {
      $('#dialog-image').src = `assets/${file}`;
      $('#dialog-image').alt = name;
      $('#dialog-title').textContent = name;
      $('#dialog-score').textContent = `Điểm tương đồng minh họa: ${score.toFixed(2)}. Không phải kết quả truy hồi từ mô hình.`;
      $('#image-dialog').showModal();
    });
    return card;
  }));
  $$('[data-query]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.query === gallerySet)));
}
$$('[data-query-mode]').forEach(button => button.addEventListener('click', () => {
  queryMode = button.dataset.queryMode;
  $('#text-query').hidden = queryMode !== 'text';
  $('#image-query').hidden = queryMode !== 'image';
  $('#search-query').required = queryMode === 'text';
  $$('[data-query-mode]').forEach(item => { const selected = item === button; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
}));
$$('[data-query]').forEach(button => button.addEventListener('click', () => { gallerySet = button.dataset.query; $('#search-query').value = gallerySets[gallerySet].query; renderGallery(); }));
$('#gallery-sort').addEventListener('change', renderGallery);
$('#retrieval-upload').addEventListener('change', event => previewFile(event.target.files[0], event.target, $('#retrieval-reference'), $('#retrieval-upload-error'), file => { referenceReady = true; $('#retrieval-filename').textContent = file.name; }));
$('#retrieval-form').addEventListener('submit', event => {
  event.preventDefault();
  if (queryMode === 'image' && !referenceReady) { $('#retrieval-upload-error').textContent = 'Chọn một ảnh tham chiếu để xem giao diện mẫu.'; $('#retrieval-upload').focus(); return; }
  renderGallery();
  $('#gallery-description').textContent = `${gallerySets[gallerySet].images.length} ảnh mẫu. Truy vấn của bạn không được xử lý bởi mô hình.`;
});
renderGallery();

const chatSamples = {
  returns: { question: 'Đổi trả trong bao lâu?', answer: 'Bạn có thể đổi hoặc trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng. Riêng thời trang và giày dép được đổi size trong vòng 14 ngày.', source: 'doi_tra.md', excerpt: 'Khách hàng được đổi hoặc trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng. Riêng thời trang và giày dép được đổi size trong vòng 14 ngày.' },
  shipping: { question: 'Thời gian giao hàng là bao lâu?', answer: 'Nội thành Hà Nội và TP. Hồ Chí Minh: 1-2 ngày. Các tỉnh thành khác: 3-5 ngày. Huyện đảo và vùng sâu: 5-7 ngày.', source: 'giao_hang.md', excerpt: 'ShopLite giao hàng toàn quốc. Nội thành Hà Nội và TP. Hồ Chí Minh nhận hàng trong 1-2 ngày; các tỉnh thành khác 3-5 ngày; huyện đảo và vùng sâu 5-7 ngày.' },
  payment: { question: 'Có những phương thức thanh toán nào?', answer: 'ShopLite chấp nhận COD, thẻ ATM nội địa, Visa/Mastercard/JCB, ví MoMo, ZaloPay, VNPay và chuyển khoản qua mã QR.', source: 'thanh_toan.md', excerpt: 'ShopLite chấp nhận thanh toán khi nhận hàng (COD), thẻ ATM nội địa, thẻ Visa/Mastercard/JCB, ví điện tử MoMo, ZaloPay, VNPay và chuyển khoản ngân hàng qua mã QR.' },
};
function resetChat() {
  $('#chat-messages').innerHTML = `<div class="chat-welcome"><span class="chat-avatar" aria-hidden="true">${icon('layers')}</span><h2>Bạn muốn tìm hiểu gì?</h2><p>Chọn một câu hỏi gợi ý để xem hội thoại mẫu có dẫn nguồn.</p></div>`;
  $('#chat-input').value = '';
  $('#character-count').textContent = '0 / 1000';
  $('#chat-error').textContent = '';
}
function addMessage(role, text, sample) {
  $('.chat-welcome')?.remove();
  const message = document.createElement('div');
  message.className = `message ${role}`;
  const label = document.createElement('p');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'Bạn' : 'Trợ lý | Câu trả lời mẫu';
  const content = document.createElement('p');
  content.className = 'message-text';
  content.textContent = text;
  message.append(label, content);
  if (sample) {
    const details = document.createElement('details');
    details.className = 'source-detail';
    const summary = document.createElement('summary');
    summary.textContent = `Nguồn tham khảo: ${sample.source}`;
    const excerpt = document.createElement('p');
    excerpt.textContent = sample.excerpt;
    details.append(summary, excerpt);
    message.append(details);
  }
  $('#chat-messages').append(message);
}
function showConversation(question, sample) {
  $('#chat-error').textContent = '';
  addMessage('user', question);
  addMessage('assistant', sample?.answer || 'Đây là giao diện minh họa, chưa xử lý câu hỏi tự do. Bạn có thể chọn gợi ý về đổi trả, giao hàng hoặc thanh toán để xem câu trả lời mẫu.', sample);
  $('#chat-input').value = '';
  $('#character-count').textContent = '0 / 1000';
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
}
$$('[data-chat-prompt]').forEach(button => button.addEventListener('click', () => { const sample = chatSamples[button.dataset.chatPrompt]; showConversation(sample.question, sample); }));
$('#chat-form').addEventListener('submit', event => {
  event.preventDefault();
  const question = $('#chat-input').value.trim();
  if (!question) { $('#chat-error').textContent = 'Vui lòng nhập câu hỏi hoặc chọn một gợi ý.'; $('#chat-input').focus(); return; }
  const sample = Object.values(chatSamples).find(item => item.question === question);
  showConversation(question, sample);
});
$('#chat-input').addEventListener('input', event => { $('#character-count').textContent = `${event.target.value.length} / 1000`; $('#chat-error').textContent = ''; });
$('#clear-chat').addEventListener('click', () => { resetChat(); $('#chat-input').focus(); });
resetChat();
window.addEventListener('hashchange', route);
route();
