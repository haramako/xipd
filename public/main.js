$( function(){
	$('#update-subdomain').on('submit',function(){
		$.getJSON('/update', $('#update-subdomain').serialize(), function(data){
			if( data.err == 'ok' ){
				var dialog = $( $.parseHTML( $('#success-dialog').text().trim() )[0] );
				dialog.find('.message').text('success!');
				dialog.appendTo('body');
			}else{
				alert('error!'+JSON.stringify(data));
			}
		});
		return false;
	});

	$('body').on('click', '.dialog', function(ev){
		ev.target.remove();
	});
});
