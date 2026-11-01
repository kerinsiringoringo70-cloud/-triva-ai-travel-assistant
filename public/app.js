const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const welcomeEl = document.getElementById('welcome');
const chatArea = document.getElementById('chatArea');

let conversation = [];
let isSending = false;

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addMessage(role, text) {
  welcomeEl.hidden = true;

  const row = document.createElement('div');
  row.className = `message-row ${role === 'user' ? 'user' : 'assistant'}`;

  if (role !== 'user') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '✈️';
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesEl.appendChild(row);

  scrollToBottom();
}

function showTyping() {
  // Hindari indikator mengetik muncul lebih dari satu kali
  document.getElementById('typingIndicator')?.remove();

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.id = 'typingIndicator';

  typing.innerHTML = `
    <span>Triva sedang berpikir</span>
    <span class="typing-dots">
      <i></i><i></i><i></i>
    </span>
  `;

  messagesEl.appendChild(typing);
  scrollToBottom();
}

function hideTyping() {
  document.getElementById('typingIndicator')?.remove();
}

async function sendMessage(value) {
  const text = value.trim();

  if (!text || isSending) return;

  isSending = true;
  sendButton.disabled = true;

  // Tampilkan pesan pengguna
  addMessage('user', text);

  // Simpan pesan ke riwayat percakapan
  conversation.push({
    role: 'user',
    text: text
  });

  inputEl.value = '';
  inputEl.style.height = 'auto';

  showTyping();

  // Batasi waktu tunggu respons server
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation: conversation
      }),
      signal: controller.signal
    });

    // Baca respons server
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error || `Server mengalami kesalahan (${response.status}).`
      );
    }

    if (!data || typeof data.result !== 'string' || !data.result.trim()) {
      throw new Error('Gemini tidak memberikan jawaban. Silakan coba lagi.');
    }

    // Hilangkan indikator mengetik
    hideTyping();

    // Tampilkan jawaban Triva
    addMessage('model', data.result);

    // Simpan jawaban ke riwayat percakapan
    conversation.push({
      role: 'model',
      text: data.result
    });

  } catch (error) {
    hideTyping();

    let errorMessage = error.message;

    if (error.name === 'AbortError') {
      errorMessage = 'Waktu tunggu habis. Server atau Gemini terlalu lama merespons. Silakan coba lagi.';
    } else if (error instanceof TypeError) {
      errorMessage = 'Tidak dapat terhubung ke server. Pastikan server Node.js masih berjalan.';
    }

    console.error('Kesalahan saat mengirim pesan:', error);

    addMessage(
      'model',
      `Maaf, Triva mengalami kendala:\n${errorMessage}`
    );

  } finally {
    clearTimeout(timeoutId);

    hideTyping();

    isSending = false;
    sendButton.disabled = false;
    inputEl.focus();
  }
}

// Tombol kirim
sendButton.addEventListener('click', () => {
  sendMessage(inputEl.value);
});

// Kirim menggunakan tombol Enter
inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage(inputEl.value);
  }
});

// Sesuaikan tinggi input secara otomatis
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';

  inputEl.style.height = `${Math.min(
    inputEl.scrollHeight,
    125
  )}px`;
});

// Tombol saran pertanyaan
document.querySelectorAll('.suggestion').forEach((button) => {
  button.addEventListener('click', () => {
    sendMessage(button.dataset.prompt);
  });
});

// Reset percakapan
function resetChat() {
  if (isSending) return;

  conversation = [];

  messagesEl.replaceChildren();
  welcomeEl.hidden = false;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  inputEl.focus();
}

// Tombol chat baru
document.getElementById('newChat').addEventListener('click', resetChat);

// Tombol hapus percakapan
document.getElementById('clearChat').addEventListener('click', resetChat);