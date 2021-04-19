<script>
	export let name;
	export let content;
	export let detail;
	export let showmore = false;
</script>

<div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
	<div class="md:flex">
		<div class="md:flex-shrink-0">
			<img
				class="h-48 w-full object-cover md:w-48"
				src="https://dummyimage.com/300"
				alt="Man looking at item at a store"
			/>
		</div>

		<div class="p-8">
			<div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
				{name}
			</div>
			<a href="/" class="block mt-1 text-lg leading-tight font-medium text-black hover:underline"
				>{content}</a
			>
			<p class="mt-2 text-gray-500">
				{detail}
			</p>
		</div>
	</div>
</div>
