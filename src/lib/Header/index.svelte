<script lang="ts">
	import { page } from '$app/stores';
	import logo from './svelte-logo.svg';
</script>

<ion-header>
	<nav>
		<ul class="flex justify-between">
			<strong translate="no">PEA</strong>
			<div class="flex gap-5 justify-end sm: text-sm">
				<li class:active={$page.path === '/'}><a sveltekit:prefetch href="/">HomePage</a></li>
				<li class:active={$page.path === '/about'}>
					<a sveltekit:prefetch href="/about">AboutUs</a>
				</li>
				<li class:active={$page.path === '/search'}>
					<a sveltekit:prefetch href="/search">Search</a>
				</li>
				<li class:active={$page.path === '/todos'}>
					<a sveltekit:prefetch href="/todos">Todos</a>
				</li>
				<li class:active={$page.path === '/box'}>
					<a sveltekit:prefetch href="/box">Box</a>
				</li>
			</div>
		</ul>
	</nav>
</ion-header>

<style>
	nav {
		@apply bg-[#0000FF] bg-opacity-25 p-5 text-xl focus:border-[#0000FF];
	}

	li.active {
	}
</style>
