// Define routes
const routes = {
    '/': '/app/html/sign_up.html',
    '/login': '/app/html/login.html',
    '/landing': '/app/html/Landing.html',
    '/profile': '/app/html/profile.html',
    '/add-post': '/app/html/add_edit_post.html',
    '/content-view': '/app/html/content_view.html'
};

// Handle route changes
async function handleRoute() {
    const path = window.location.pathname;
    const queryParams = window.location.search;
    const route = routes[path] || routes['/'];
    
    try {
        const response = await fetch(route);
        const html = await response.text();
        
        // Extract the body content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const bodyContent = tempDiv.querySelector('body').innerHTML;
        
        // Update the content
        document.getElementById('app-content').innerHTML = bodyContent;
        
        // Update page title
        const pageTitle = tempDiv.querySelector('title')?.textContent;
        if (pageTitle) {
            document.title = pageTitle;
        }

        // Load appropriate scripts based on route
        await loadScripts(path);

        // Dispatch event that content has been loaded
        window.dispatchEvent(new CustomEvent('router-content-loaded'));

        // Initialize any page-specific functionality
        if (path === '/landing') {
            // Initialize landing page
            const homeButton = document.getElementById("nav-home");
            if (homeButton) homeButton.classList.toggle("active");
            displayPostsDynamically("posts", "all");
        }
    } catch (error) {
        console.error('Error loading page:', error);
    }
}

// Load page-specific scripts
async function loadScripts(path) {
    const scriptMap = {
        '/': ['authentication.js'],
        '/login': ['login.js'],
        '/landing': ['landing.js'],
        '/profile': ['profile.js'],
        '/add-post': ['add_edit_post.js'],
        '/content-view': ['content_view.js']
    };

    // Remove any previously loaded page-specific scripts
    const oldScripts = document.querySelectorAll('script[data-page-script]');
    oldScripts.forEach(script => script.remove());

    // Load new scripts
    const scripts = scriptMap[path] || [];
    for (const script of scripts) {
        await new Promise((resolve, reject) => {
            const scriptElement = document.createElement('script');
            scriptElement.src = `/public/js/${script}`;
            scriptElement.setAttribute('data-page-script', 'true');
            scriptElement.onload = resolve;
            scriptElement.onerror = reject;
            document.body.appendChild(scriptElement);
        });
    }
}

// Initialize router
window.addEventListener('popstate', handleRoute);
window.addEventListener('load', handleRoute);

// Handle navigation
window.navigateTo = function(path) {
    history.pushState({}, '', path);
    handleRoute();
}; 