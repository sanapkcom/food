const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signInWithEmail(email, password) {
    return await db.auth.signInWithPassword({ email, password });
}

async function signUpWithEmail(email, password) {
    return await db.auth.signUp({ email, password });
}

async function signOut() {
    const { error } = await db.auth.signOut();
    if (!error) {
        window.location.reload();
    }
    return { error };
}

async function getCurrentUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
}

db.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyAuthState(user));
    } else {
        applyAuthState(user);
    }
});

function applyAuthState(user) {
    const authNav      = document.getElementById('auth-nav');
    const addPlaceForm = document.getElementById('add-place-form');
    const loginPrompt  = document.getElementById('login-prompt');

    if (user) {
        if (authNav) authNav.innerHTML = `
            <span class="user-info">${user.email}</span>
            <button onclick="signOut()" class="btn-primary" style="padding:8px 16px;font-size:0.9rem;height:auto;">Logout</button>`;
        if (addPlaceForm) addPlaceForm.style.display = 'flex';
        if (loginPrompt)  loginPrompt.style.display  = 'none';
    } else {
        if (authNav) authNav.innerHTML = `
            <a href="auth.html"><button class="btn-primary" style="padding:8px 16px;font-size:0.9rem;height:auto;">Login</button></a>`;
        if (addPlaceForm) addPlaceForm.style.display = 'none';
        if (loginPrompt)  loginPrompt.style.display  = 'block';
    }
}