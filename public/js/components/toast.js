class ToastManager {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fadeOut');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

window.toast = new ToastManager();
