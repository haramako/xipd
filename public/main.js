$( function(){
	function randomSubdomain(){
		var chars = 'abcdefghljklmnopqrstuvwxyz0123456789';
		var s = chars[Math.floor(Math.random()*26)];
		for( var i=0; i<3; i++ ){
			s += chars[Math.floor(Math.random()*36)];
		}
		return s;
	}

	function tmpl(id,param){
		return new t( $('#'+id).text() ).render(param);
	}

	$(document).on('click', '.result-url', function(ev){ ev.target.select(); } );
	$('input[name=subdomain]').val(randomSubdomain());

	
	$('#update-subdomain').on('submit',function(){
		$.getJSON('/update?'+$('#update-subdomain').serialize(), function(data){
			if( data.err == 'ok' ){
				$('.result-inner').html( tmpl( 'success', {
					subdomain: $('input[name="subdomain"]').val().trim(),
					domain: DOMAIN,
					addr: $('input[name="address"]').val().trim(),
					specialMessage: data.specialMessage
				} ) );
				setTimeout( function(){
					var text = $('.result-url')[0];
					text.focus();
					text.select();
				}, 0 );
			}else{
				var id = 'error-'+data.err.replace(/ /g,'-');
				if( !$('#'+id)[0] ) id = 'error-unknown';
				$('.result-inner').html( tmpl( id, data ) );
			}
			$('.result').animate({height:120},100).show();
		});
		return false;
	});

	$('body').on('click', '.dialog', function(ev){
		ev.target.remove();
	});
});
