import './styles.css';

console.log('Main script loaded successfully');
const app = document.querySelector('#app');
app.innerHTML = `
  <main class="min-h-screen bg-gray-900 text-white p-4">
    <h1>Colorway Theme Preview</h1>
    <p>A minimal preview app for Colorway themes</p>
    <div class="mt-4">
      <button class="bg-blue-500 text-white px-4 py-2 rounded">Test Button</button>
    </div>
  </main>
`;
