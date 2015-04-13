function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

$(function() {
	var username = getCookie("username");
	$("#user_search").keyup(function(event) {
		if (event.keyCode === 13) {
			$("#search").click();
		}
	});
	$("#search").click(function() {
		var user_search = $("#user_search").val();
		$("#user_list").empty();
		if (user_search) {
			$.ajax({
				type: "POST",
				url: "/user-search",
				data: {
					user: user_search,
					like: true
				},
				success: function(data) {
					if (!data || data.length === 0) {
						$("#user_list").append("<span>No users found.</span>");
					} else {
						for (var i = 0; i < data.length; i++)
							if (data[i] != username) {
								$("#user_list").append("<a class='list-group-item' href='/challenge?opponent=" + data[i] + "'>" + data[i] + "</a>");
							}
					}
				}
			});
		}
	})
})