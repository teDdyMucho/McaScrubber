// Settings Modal logic for AI Prompt

document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const saveAiPrompt = document.getElementById('saveAiPrompt');
    const cancelAiPrompt = document.getElementById('cancelAiPrompt');
    const aiPromptInput = document.getElementById('aiPromptInput');

    // Load saved prompt on open
    function openModal() {
        aiPromptInput.value = localStorage.getItem('aiPrompt') || '';
        settingsModal.style.display = 'flex';
        aiPromptInput.focus();
    }
    function closeModal() {
        settingsModal.style.display = 'none';
    }
    settingsButton.addEventListener('click', openModal);
    closeSettingsModal.addEventListener('click', closeModal);
    cancelAiPrompt.addEventListener('click', closeModal);
    saveAiPrompt.addEventListener('click', () => {
        localStorage.setItem('aiPrompt', aiPromptInput.value);
        closeModal();
    });
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });
});
