<script>
	export let title;
</script>

<div class="box">
	<slot prop={title} name="header" class="bg-blue-400"><!-- optional fallback --></slot>
	<slot />
	<slot name="footer"><!-- optional fallback --></slot>
</div>

<style>
	.box {
		width: 300px;
		border: 1px solid #aaa;
		border-radius: 2px;
		box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
		padding: 1em;
		margin: 0 0 1em 0;
	}
</style>
