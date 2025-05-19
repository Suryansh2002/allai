// chat.js - Handles global chat UI and logic for Supabase
console.log('Chat script loaded');

const chatScript = document.createElement('script');
chatScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(chatScript);

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.setupChat = async function(user) {
    const chatContainer = document.getElementById('chat-main');
    // Fetch user profile (for avatar)
    let profilePicUrl = null;
    let { data: userProfile } = await supabase.from('users').select('profile_pic_url').eq('id', user.id).single();
    if (userProfile && userProfile.profile_pic_url) {
      profilePicUrl = userProfile.profile_pic_url;
    }
    // Display name logic
    function randomName() {
      const animals = ['Otter', 'Penguin', 'Wolf', 'Fox', 'Tiger', 'Panda', 'Koala', 'Hawk', 'Bear', 'Lynx', 'Falcon', 'Dolphin', 'Moose', 'Raven', 'Cobra', 'Eagle', 'Leopard', 'Orca', 'Bison', 'Mantis'];
      const colors = ['Blue', 'Crimson', 'Emerald', 'Violet', 'Amber', 'Indigo', 'Silver', 'Gold', 'Scarlet', 'Azure', 'Ivory', 'Cyan', 'Coral', 'Jade', 'Ruby', 'Sable', 'Teal', 'Frost', 'Shadow', 'Blaze'];
      return colors[Math.floor(Math.random()*colors.length)] + ' ' + animals[Math.floor(Math.random()*animals.length)];
    }
    displayName = randomName();
    chatContainer.innerHTML = `
      <div class="flex flex-col h-full w-full flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-gray-400 text-sm">Display name:</span>
          <input id="display-name-input" type="text" value="${displayName}" maxlength="24" class="border border-gray-700 bg-[#18181b] text-gray-100 placeholder-gray-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-900 p-1.5 rounded transition-all text-sm w-40" />
        </div>
        <div id="chat-messages" class="flex-1 min-h-0 overflow-y-auto bg-[#23272f] rounded-xl p-4 mb-3 border border-gray-800 shadow-inner text-gray-100"></div>
        <form id="chat-form" class="flex gap-2 mt-2">
          <input id="chat-input" type="text" placeholder="Type your message..." class="flex-1 border border-gray-700 rounded-xl p-2 focus:ring-2 focus:ring-blue-900 bg-[#18181b] text-gray-100 placeholder-gray-400" required />
          <button type="submit" class="bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl px-4 py-2 shadow transition-all">Send</button>
        </form>
      </div>
    `;
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const displayNameInput = document.getElementById('display-name-input');
    displayNameInput.oninput = (e) => {
      displayName = e.target.value.trim() || randomName();
    };

    async function addDeleteListener(msg) {
      if (msg.username !== user.email) return;

      const btn = chatMessages.querySelector(`.delete-btn[data-id="${msg.id}"]`);
      if (btn) {
        btn.onclick = async (e) => {
          const id = btn.getAttribute('data-id');
          const { error } = await supabase.from('global_chat').delete().eq('id', id);
          if (error) showToast('Failed to delete', 'error');
        };
      }
    }

    let fetchImages = new Map();
    
    async function addProfileUrl(msg) {
      if (fetchImages.has(msg.username)) return;
      const {data, error} = await supabase.from('userdata').select('profile_pic_url').eq('email', msg.username).single()
      if (data && data.profile_pic_url) {
        fetchImages.set(msg.username, data.profile_pic_url);
      }
    }

    async function loadMessages() {
      const { data, error } = await supabase.from('global_chat').select('*').order('created_at', { ascending: true }).limit(100);
      if (!error && data) {
        const promises = data.map(msg => addProfileUrl(msg));
        console.log('Promises:', promises);
        Promise.all(promises).then(() => {
          chatMessages.innerHTML = data.map(msg => renderMessage(msg)).join('');
          chatMessages.scrollTop = chatMessages.scrollHeight;
          data.forEach(addDeleteListener);
        });
      }
    }
    function renderMessage(msg) {
      return `
        <div class="mb-2 group flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${fetchImages.get(msg.username) ? `<img src="${fetchImages.get(msg.username)}" class="w-8 h-8 rounded-full object-cover border border-gray-700" alt="avatar" />` : `<div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs">?</div>`}
            <span class="font-semibold text-blue-400">${msg.display_name || msg.username || 'User'}:</span>
            <span class="text-gray-100">${msg.message}</span>
            <span class="text-xs text-gray-500 ml-2">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          ${(msg.username === user.email) ? `<button data-id="${msg.id}" class="delete-btn ml-2 text-xs text-red-400 hover:text-red-600 bg-transparent border-none">Delete</button>` : ''}
        </div>
      `;
      
    }
    loadMessages();

    // Listen for new/deleted messages in realtime
    const channel = supabase.channel('global_chat_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, payload => {
        const msg = payload.new;
        // Rickroll detection
        if (msg && typeof msg.message === 'string' && msg.message.toLowerCase().includes('rick roll')) {
          showRickRoll();
        }
        addProfileUrl(msg).then(() => {
          chatMessages.insertAdjacentHTML('beforeend', renderMessage(msg));
          chatMessages.scrollTop = chatMessages.scrollHeight;
          // Add delete event if needed
          addDeleteListener(msg);
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'global_chat' }, payload => {
        const id = payload.old.id;
        const btn = chatMessages.querySelector(`.delete-btn[data-id="${id}"]`);
        if (btn) {
          btn.closest('.mb-2').remove();
        } else {
          // fallback: reload all
          loadMessages();
        }
      })
      .subscribe();

    chatForm.onsubmit = async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;
      // Fetch latest profile pic url in case user updated it
      const { error } = await supabase.from('global_chat').insert({
        message,
        username: user.email,
        display_name: displayName,
      });
      if (!error) chatInput.value = '';
      else showToast('Failed to send message', 'error');
    };

    function showRickRoll() {
      if (document.getElementById('rickroll-gif')) return;
      const gif = document.createElement('img');
      gif.id = 'rickroll-gif';
      gif.src = 'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif';
      gif.style.position = 'fixed';
      gif.style.top = '50%';
      gif.style.left = '50%';
      gif.style.transform = 'translate(-50%, -50%)';
      gif.style.zIndex = '9999';
      gif.style.width = '320px';
      gif.style.height = '240px';
      gif.style.borderRadius = '1rem';
      gif.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.18)';
      document.body.appendChild(gif);
      setTimeout(() => {
        gif.remove();
      }, 2000);
    };
  };


function showToast(message, type = 'info') {
  let toast = document.getElementById('supabase-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'supabase-toast';
    toast.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white text-center text-base font-bold opacity-0 pointer-events-none transition-all';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white text-center text-base font-bold pointer-events-none transition-all ` +
    (type === 'error' ? 'bg-red-500' : 'bg-green-500');
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}
