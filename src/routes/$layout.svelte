<script lang="ts">
	import Nav from '$lib/Components/ฺNav.svelte';
	import Header from '$lib/Header/index.svelte';
	import '../app.postcss';
</script>

<body>
	<ion-split-pane content-id="main">
		<!--  the side menu  -->
		<ion-menu content-id="main">
			<Nav />
		</ion-menu>
		<ion-content id="main">
			<Header />

			<div class="container">
				<slot><!-- optional fallback --></slot>
			</div>
		</ion-content>
	</ion-split-pane>
	<!-- src/routes/$layout.svelte -->
</body>

<style>
</style>
