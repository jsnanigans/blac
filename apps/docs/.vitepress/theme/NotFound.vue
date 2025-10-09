<template>
  <div class="not-found">
    <img src="/logo.svg" alt="Blac Logo" class="logo" />
    <h1>404</h1>
    <div class="divider"></div>
    <h2>Page Not Found</h2>
    <p>Sorry, we couldn't find the page you're looking for.</p>
    <div class="actions">
      <a href="/" class="action">Return Home</a>
      <a href="/learn/introduction" class="action alt">Documentation</a>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  max-width: 500px;
  margin: 0 auto;
  padding: 100px 24px;
  text-align: center;
}

.logo {
  width: 100px;
  height: 100px;
  margin-bottom: 24px;
  animation: rotate 10s infinite linear;
  opacity: 0.8;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

h1 {
  font-size: 6rem;
  line-height: 1;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-brand);
}

.divider {
  height: 2px;
  width: 60px;
  margin: 24px auto;
  background: linear-gradient(
    90deg,
    var(--vp-c-brand),
    var(--vp-c-brand-accent)
  );
}

h2 {
  font-size: 2rem;
  font-weight: 500;
  margin: 0 0 20px;
}

p {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin-bottom: 32px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.action {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  background-color: var(--vp-c-brand);
  color: white;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  text-decoration: none;
}

.action:hover {
  background-color: var(--vp-c-brand-light);
}

.action.alt {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.action.alt:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
