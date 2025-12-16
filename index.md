---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

---
<script setup>
import { projectNav, projectNavTitle } from './.vitepress/config/sidebar'

const projectLinks = projectNav ?? []
const title = projectNavTitle || '配置导航'
</script>

<section v-if="projectLinks.length" class="project-shortcuts">
  {{ title }}
  <div class="project-grid">
    <a
      v-for="item in projectLinks"
      :key="item.link"
      class="project-card"
      :href="item.link"
    >
      <span class="project-card__name">{{ item.text }}</span>
      <span class="project-card__link">{{ item.link }}</span>
    </a>
  </div>
</section>

<style scoped>
.project-shortcuts {
  margin-top: 3rem;
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.project-shortcuts h2 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.project-description {
  margin: 0 0 1.5rem;
  color: var(--vp-c-text-2);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.project-card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-border-soft);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.project-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.project-card__name {
  font-weight: 600;
}

.project-card__link {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  word-break: break-all;
}

</style>
