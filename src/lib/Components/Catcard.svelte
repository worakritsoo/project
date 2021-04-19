<script>
	import { onMount } from 'svelte';
	let box = {};
	let random = Math.floor(Math.random() * 100) + 240;
	let src = `http://placekitten.com/g/240/${random}`;
	let loren = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Quo impedit porro optio minima, inventore dolorem ea libero, doloremque ipsam praesentium assumenda dignissimos nulla at cupiditate ex! Quo praesentium beatae eum.`;
	box.name = loren.slice(1 + Math.random() * 10, 20);
	let photos = [];
</script>

<div
	class="py-8 px-8 m-5 max-w-sm  bg-white rounded-xl shadow-md space-y-2 sm:py-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-6"
>
	<img
		class="block mx-auto w-3/12 rounded-full sm:mx-0 sm:flex-shrink-0"
		{src}
		alt="Woman's Face"
	/>
	<div class="text-center space-y-2 sm:text-left">
		<div class="space-y-0.5">
			<p class="text-lg text-black font-semibold">{box.name}</p>
			<p class="text-gray-500 font-medium">{src}</p>
		</div>
		<button
			class="px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
			>Open</button
		>
		<button
			class="px-2 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
			>👍🏻</button
		>
		<button
			class="px-2 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
			>🚀</button
		>
	</div>
</div>

<!-- markup (zero or more items) goes here -->
<style>
	/* your styles go here */
</style>
