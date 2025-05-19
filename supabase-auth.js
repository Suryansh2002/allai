// Add your Supabase URL and Anon Key here
let SUPABASE_URL = 'https://lkcejbworkcwsmunusak.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrY2VqYndvcmtjd3NtdW51c2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTEzNDYsImV4cCI6MjA2MzA4NzM0Nn0.ctedgh1ax9SUNvs-9_9EoTi7rVPuwhHKutggFZS_mMU';

let script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(script);

script.onload = () => {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    const container = document.getElementById('supabase-auth-container');
    container.innerHTML = '';
    if (!session) {
      // Not logged in, show login form
      // Add login/signup slider
      let isSignup = false;
      function renderAuthForm() {
        loginForm.innerHTML = `
          <input type="email" id="email" placeholder="Email" required class="border border-gray-700 bg-[#18181b] text-gray-100 placeholder-gray-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-900 p-3 rounded-xl transition-all shadow-sm" />
          <input type="password" id="password" placeholder="Password" required class="border border-gray-700 bg-[#18181b] text-gray-100 placeholder-gray-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-900 p-3 rounded-xl transition-all shadow-sm" />
          ${isSignup ? `<input type="password" id="confirm-password" placeholder="Confirm Password" required class="border border-gray-700 bg-[#18181b] text-gray-100 placeholder-gray-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-900 p-3 rounded-xl transition-all shadow-sm" />` : ''}
          ${isSignup ? `<div class='flex flex-col gap-2'><label class='text-gray-400 text-xs'>Profile Picture (optional)</label><input type='file' id='profile-pic' accept='image/*' class='text-gray-100 text-xs bg-[#18181b] border border-gray-700 rounded-xl p-2' /></div>` : ''}
          <div class="flex gap-2 mt-2">
            <button type="submit" class="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl p-2 shadow transition-all">${isSignup ? 'Sign Up' : 'Login'}</button>
          </div>
          <div class="flex items-center justify-center mt-4">
            <div class="relative w-32 h-10 bg-[#23272f] rounded-full flex items-center shadow-inner">
              <button type="button" id="slider-login" class="absolute left-0 top-0 h-10 w-16 rounded-full transition-all duration-300 ${!isSignup ? 'bg-blue-700 text-white' : 'text-gray-400'} font-semibold focus:outline-none">Login</button>
              <button type="button" id="slider-signup" class="absolute right-0 top-0 h-10 w-16 rounded-full transition-all duration-300 ${isSignup ? 'bg-blue-700 text-white' : 'text-gray-400'} font-semibold focus:outline-none">Sign Up</button>
              <div class="absolute top-1 left-1 h-8 w-14 rounded-full bg-blue-700 transition-all duration-300" style="transform: translateX(${isSignup ? '64px' : '0'});"></div>
            </div>
          </div>
        `;
        loginForm.querySelector('#slider-login').onclick = () => {
          isSignup = false;
          renderAuthForm();
        };
        loginForm.querySelector('#slider-signup').onclick = () => {
          isSignup = true;
          renderAuthForm();
        };
      }
      const loginForm = document.createElement('form');
      loginForm.className = 'flex flex-col gap-5 animate-fade-in w-full max-w-xs mx-auto';
      renderAuthForm();
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#email').value;
        const password = loginForm.querySelector('#password').value;
        let profilePicUrl = null;
        if (isSignup) {
          const confirmPassword = loginForm.querySelector('#confirm-password').value;
          if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
          }
          // Handle profile pic upload
          const fileInput = loginForm.querySelector('#profile-pic');
          let uploadedUrl = null;
          if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${email}-profile.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('profile-pics').upload(fileName, file, { upsert: false });
            if (uploadError) {
              showToast('Profile pic upload failed', 'error');
              return;
            }
            uploadedUrl = supabase.storage.from('profile-pics').getPublicUrl(fileName).data.publicUrl;
          }
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) {
            showToast(error.message, 'error');
          } else {
            // Insert user profile with pic URL
            await supabase.from('userdata').insert({ email, profile_pic_url: uploadedUrl });
            
            showToast('Check your email for confirmation!', 'success');
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            showToast(error.message, 'error');
          } else {
            showToast('Login successful!', 'success');
            setTimeout(checkAuth, 800);
          }
        }
      };
      container.appendChild(loginForm);
    } else {
      // Remove any existing logout button to avoid duplicates
      const oldLogout = document.getElementById('logout-btn');
      if (oldLogout) oldLogout.remove();
      document.body.insertAdjacentHTML('beforeend', `
        <button id="logout-btn" class="fixed top-6 right-8 z-50 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl p-2 px-6 shadow transition-all duration-200 scale-100 hover:scale-105">Logout</button>
      `);
      document.getElementById('logout-btn').onclick = async () => {
        await supabase.auth.signOut();
        showToast('Logged out!', 'success');
        setTimeout(() => location.reload(), 800);
      };
      // Show chat as main content
      container.innerHTML = `<div id="chat-main" class="flex flex-col flex-1"></div>`;
      // Always (re)load chat.js and call setupChat after it's loaded
      function loadChatScriptAndInit() {
        if (window.setupChat) {
          window.setupChat(session.user);
        } else {
          const chatScript = document.createElement('script');
          chatScript.src = 'chat.js';
          chatScript.onload = () => window.setupChat && window.setupChat(session.user);
          document.body.appendChild(chatScript);
        }
      }
      // Wait for DOM to be ready before loading chat
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChatScriptAndInit);
      } else {
        loadChatScriptAndInit();
      }
    }
  }

  // Toast notification
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

  // Add fade-in animation
  const style = document.createElement('style');
  style.innerHTML = `
    .animate-fade-in {
      animation: fadeIn 0.7s cubic-bezier(.4,0,.2,1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }
  `;
  document.head.appendChild(style);

  checkAuth();
};
