$(function () {

  const userURL = 'https://res.cloudinary.com/dmjs99ysw/image/upload/v1524966197/man-user_f9lr0r.png'

  const $header = $('#header')
  const $body = $('#body')
  const $footer = $('#footer')
  const $groupName = $('#group-name')
  const $groupDest = $('#group-dest')
  const $groupList = $('#li-groups')
  const $groupSearchQuery = $('#group-search-query')
  const $liGroupSearchResult = $('#li-group-search-result')
  const $liGroupSolicitations = $('#li-groups-solicitations')
  const $modalMembers = $('#modal-members')
  const $modalAddGroup = $('#modal-add-group')
  const $ulMemberData = $('#ul-member-data')
  const $modalMembersGroup = $('#modal-members-group')
  const $headerItems = $('.header-menu-item')
  const $svgConfirm = $('#svg-confirm')
  const $svgTrash = $('#svg-trash')

  $('#btn-signin').click(signIn)
  $('#btn-add-group').click(createGroup)
  $('#btn-search-group').click(searchGroup)
  $('#modal-btn-close').click(() => $modalMembers[0].close())
  $('#modal-add-group-btn-close').click(() => $modalAddGroup[0].close())
  $('#fab-add-group').click(() => {
    $groupDest.val('')
    $groupName.val('')
    $modalAddGroup[0].showModal()
  })
  $('#btn-logout').click(() => firebase.auth().signOut().then(() => {
    document
      .location
      .reload()
    sessionStorage.clear()
  }))
  $headerItems.click(function () {
    $headerItems.removeClass('active')
    $(this).addClass('active')
    $('.container').hide()
    $('#' + $(this).data('tab')).fadeIn(200)
  })

  if (sessionStorage.getItem('user') !== null) {
    showHome()
  }

  function getUser() {
    return JSON.parse(sessionStorage.getItem('user'))
  }

  function showHome() {
    $('#login').hide()
    $('#home').show()
    const user = getUser()
    loadUser(user.uid)
    $('#name').text(user.displayName)
    $('#avatar').attr('src', user.photoURL)
    loadGroups()
    loadSolicitations()
  }

  function createUser(uid) {
    const {displayName, photoURL, email} = getUser()
    database
      .ref('users/' + uid)
      .set({groups: true, displayName, photoURL, email})
  }

  function loadUser(uid) {
    database
      .ref('users/' + uid)
      .once('value')
      .then(function (snapshot) {
        if (snapshot.val() === null) {
          createUser(uid)
        }
      })
  }

  function loadSolicitations() {
    $liGroupSolicitations.html('')
    database
      .ref('users/' + getUser().uid + '/solicitations/groups')
      .orderByValue()
      .once('value', function (snapshot) {
        const val = snapshot.val()
        if (val === null || val === undefined) 
          return
        Object
          .keys(val)
          .forEach(key => {
            const $li = $('<li></li>').css({padding: '4px 8px', color: 'var(--clr-blue)'})
            const $span = $('<span></span>')
              .text(key)
              .css({fontSize: '18px', fontWeight: '700'})
            const $ul = $('<ul></ul>')
            $li.append($span, $ul)
            $li.appendTo($liGroupSolicitations)
            Object
              .keys(val[key])
              .forEach(item => {
                const $listItem = $('<li></li>').addClass('li-accept-solicitation')
                const $div = $('<div></div>').css({display: 'flex'})
                const $spanName = $('<span></span>')
                  .text('---')
                  .css({fontSize: '14px'})
                database
                  .ref('users/' + item)
                  .once('value', function (snp) {
                    $spanName.text(snp.val().displayName)
                  })
                $spanName.appendTo($listItem)
                $('<div></div>')
                  .html($svgConfirm.html())
                  .data({userId: item, groupName: key})
                  .click(acceptSolicitation)
                  .addClass('solicitation-answer')
                  .appendTo($div)
                $('<div></div>')
                  .html($svgTrash.html())
                  .data({userId: item, groupName: key})
                  .click(refuseSolicitation)
                  .addClass('solicitation-answer')
                  .appendTo($div)
                $div.appendTo($listItem)
                $listItem.appendTo($ul)
              })
          })
      })
  }

  function acceptSolicitation() {
    const {userId, groupName} = $(this).data()
    database
      .ref('users/' + userId + '/groups/' + groupName)
      .set(true)
    database
      .ref('members/' + groupName + '/' + userId)
      .set(true)
    removeSolicitation($(this).data())
    loadSolicitations()
    loadGroups()
  }

  function refuseSolicitation() {
    removeSolicitation($(this).data())
    loadSolicitations()
  }

  function removeSolicitation({userId, groupName}) {
    database
      .ref('users/' + getUser().uid + '/solicitations/groups/' + groupName + '/' + userId)
      .remove()
  }

  function loadGroups() {
    const uid = getUser().uid
    database
      .ref('users/' + uid + '/groups')
      .orderByValue()
      .once('value', function (snapshot) {
        $groupList.html('')
        snapshot.forEach(({key}) => {
          const $li = $('<li></li>')
            .addClass('li-my-groups')
            .click(showMembers)
            .data({groupName: key})
          database
            .ref('members/' + key)
            .orderByValue()
            .once('value', item => {
              $li.append($('<span></span>').text(key + ' ').data({group: key}))
              $li.append($('<img />').addClass('group-icon').attr({src: userURL}))
              $li.append($('<span></span>').text(Object.keys(item.val()).length))
            })
          $groupList.append($li)
        })
      })
  }

  function showMembers() {
    const {groupName} = $(this).data()
    $ulMemberData.html('')
    database
      .ref('members/' + groupName)
      .orderByValue()
      .once('value', snapshot => {
        Object
          .keys(snapshot.val())
          .forEach(key => {
            database
              .ref('users/' + key)
              .orderByValue()
              .once('value', userSnapshot => {
                const {photoURL, displayName, email} = userSnapshot.val()
                const $li = $('<li></li>').addClass('list-item-member')
                const $div = $('<div></div>').addClass('list-member-info')
                const $name = $('<span></span>').text(displayName)
                const $email = $('<span></span>').text(email)
                $div.append($name, $email)
                const $img = $('<img />')
                  .addClass('thumbnail')
                  .attr({src: photoURL})
                $li.append($img, $div)
                $ulMemberData.append($li)
              })
          })
      })
    $modalMembersGroup.text($(this).find('span').data('group'))
    $modalMembers[0].showModal()
  }

  function signIn() {
    var provider = new firebase
      .auth
      .GoogleAuthProvider()
    firebase
      .auth()
      .signInWithPopup(provider)
      .then(result => {
        var token = result.credential.accessToken
        var user = result.user
        sessionStorage.setItem('token', JSON.stringify(token))
        sessionStorage.setItem('user', JSON.stringify(user))
        loadUser(user.uid)
        showHome()
      })
      .catch(function (error) {
        var errorCode = error.code
        var errorMessage = error.message
        var email = error.email
        var credential = error.credential
        console.log(error)
      })
  }

  function createGroup() {
    database
      .ref('groups/' + $groupName.val())
      .set({
        dest: $groupDest.val(),
        owner: getUser().uid
      })

    database.ref('members/' + $groupName.val() + '/' + getUser().uid).set(true)

    database
      .ref('users/' + getUser().uid + '/groups/' + $groupName.val())
      .set(true)

    $modalAddGroup[0].close()
    loadGroups()
  }

  function requestMembership() {
    const {groupName} = $(this).data()
    database
      .ref('users/')
      .child(getUser().uid + '/groups')
      .once('value', function (snapshot) {
        let groups = []
        Object
          .keys(snapshot.val())
          .forEach(e => groups.push(e))
        if (groups.some(group => group === groupName)) 
          alert('Já está no grupo')
        else {
          createSolicitation(groupName)
          alert('Solicitação realizada')
        }
      })
  }

  function createSolicitation(groupName) {
    database
      .ref('groups/' + groupName + '/owner')
      .orderByValue()
      .once('value', function (snapshot) {
        database.ref('users/' + snapshot.val() + '/solicitations/groups/' + groupName + '/' + getUser().uid).set(true)
      })
  }

  function searchGroup() {
    database
      .ref('groups')
      .orderByValue()
      .once('value', function (snapshot) {
        $liGroupSearchResult.html('')
        snapshot.forEach(({key}) => {
          if (key.includes($groupSearchQuery.val())) {
            const $li = $('<li></li>').addClass('li-search-result')
            const $span = $('<span></span>').text(key)
            const $input = $('<span></span>')
              .addClass('send-request')
              .click(requestMembership)
              .data({groupName: key})
              .text('+')
            $liGroupSearchResult.append($li.append($span, $input))
          }
        })
      })
  }
})