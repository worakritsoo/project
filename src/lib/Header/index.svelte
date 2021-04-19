<script lang="ts">
	import { page } from '$app/stores';
	import logo from './svelte-logo.svg';
	export const translate = 'no';
</script>

<ion-header>
	<nav>
		<ul class="flex justify-between">
			<strong>PEA</strong>
			<div class="flex gap-5 justify-end sm: text-sm">
				<li class:active={$page.path === '/'}><a sveltekit:prefetch href="/">หน้าแรก</a></li>
				<li class:active={$page.path === '/search'}>
					<a sveltekit:prefetch href="/search">ค้นหา</a>
				</li>
				<li class:active={$page.path === '/about'}>
					<a sveltekit:prefetch href="/about">เกี่ยวกับเรา</a>
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
