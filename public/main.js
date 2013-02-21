$( function(){
	var chars = 'abcdefghljklmnopqrstuvwxyz0123456789';
	var randomSubdomain = chars[Math.floor(Math.random()*26)];
	for( var i=0; i<5; i++ ){
		randomSubdomain += chars[Math.floor(Math.random()*36)];
	}
		
	$('input[name=subdomain]').val(randomSubdomain);
	$('span#domain-name').text('.'+location.hostname);
	
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
