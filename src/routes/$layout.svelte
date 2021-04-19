<script lang="ts">
	import Nav from '$lib/Components/ฺNav.svelte';
	import Header from '$lib/Header/index.svelte';
	import '../app.postcss';
</script>

<body>
	<ion-split-pane content-id="main">
		<!--  the side menu  -->
		<ion-menu content-id="main">
			<ion-header>
				<ion-toolbar>
					<ion-title>Menu</ion-title>
				</ion-toolbar>
			</ion-header>
			<Nav />
		</ion-menu>
		<ion-content id="main">
			<Header />

			<slot><!-- optional fallback --></slot>
		</ion-content>
	</ion-split-pane>
	<!-- src/routes/$layout.svelte -->
</body>

<style>
	ion-menu {
		@apply max-w-min;
	}
</style>
