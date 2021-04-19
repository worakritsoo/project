<script>
	import { page } from '$app/stores';
</script>

<ion-content id="main">
	<ion-list>
		<ion-item class:active={$page.path === '.'}><a sveltekit:prefetch href="/">หน้าแรก</a></ion-item
		>
		<ion-item class:active={$page.path === '/about'}>
			<a sveltekit:prefetch href="/about">เกี่ยวกับเรา</a>
		</ion-item>
		<ion-item class:active={$page.path === '/search'}>
			<a sveltekit:prefetch href="/search">ค้นหา</a>
		</ion-item>
		<!-- <li class:active={$page.path === '/todos'}>
				<a sveltekit:prefetch href="/todos">สิ่งต้องทำ</a>
			</li> -->
		<ion-item class:active={$page.path === '/box'}>
			<a sveltekit:prefetch href="/box">กล่อง</a>
		</ion-item>
		<ion-item class:active={$page.path === '/ranking'}>
			<a sveltekit:prefetch href="/ranking">จัดอันดับ</a>
		</ion-item>
		<ion-item class:active={$page.path === '/news'}>
			<a sveltekit:prefetch href="/news">ข่าวสาร</a>
		</ion-item>
	</ion-list>
</ion-content>
