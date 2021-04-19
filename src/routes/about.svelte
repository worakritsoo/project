<script context="module">
	import { browser, dev } from '$app/env';

	// we don't need any JS on this page, though we'll load
	// it in dev so that we get hot module replacement...
	export const hydrate = dev;

	// ...but if the client-side router is already loaded
	// (i.e. we came here from elsewhere in the app), use it
	export const router = browser;

	// since there's no dynamic data here, we can prerender
	// it so that it gets served as a static asset in prod
	export const prerender = true;
</script>

<!-- src/routes/about.svelte -->
<svelte:head>
	<title>About</title>
</svelte:head>

<article class="text-2xl text-center my-40">
	<h1>ค้นหา ภายใน</h1>
	จากระบบต่าง ๆ ที่เติมโตขึ้น เว็บไซด์มากขึ้น โปรแกรม มากขึ้น
	<h1>
		จึงทำขึ้นมาเพื่อให้ช่วยในการค้นหาภายใน โดยใช้การหาแบบคลุมเคลือ และอิงหน้าที่เก็บ
		เว็บที่ยังใช้งานได้ สามารถดูรายละเอียดเพิ่มเติมได้
	</h1>

	อ้างอิง
	<a href="https://www.notion.so/"> Pbox </a>
</article>

<style>
</style>
