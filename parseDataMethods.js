// code to parse data from wiki

// go to the wiki page and paste the contents of the function in the console

// for gilds and gems
function parseGilds() {
  let gilds = [];

  let table = document.getElementsByClassName("smwtable")[0];
  for (let i = 0; i < table.rows.length; i++) {
    if (i === 0) continue;
    let row = table.rows[i];
    let gild = {};
    gild.name = row.cells[0].innerText;
    gild.chance = row.cells[1].innerText;
    gild.gild1 = row.cells[2].innerText;
    gild.gild2 = row.cells[3].innerText;
    gild.gild3 = row.cells[4].innerText;
    gild.gild4 = row.cells[5].innerText;
    gild.att = row.cells[6].innerText.split('\n').join(', ');
    gild.url = row.cells[0].innerHTML.match(/href="(.*?)"/)[1];
    gilds.push(gild);
  }
  console.log(JSON.stringify(gilds));

}


// for forage
function parseForage() {
  let forage = [];

  let table = document.getElementsByClassName("smwtable")[0];
  for (let i = 0; i < table.rows.length; i++) {
    if (i === 0) continue;
    let row = table.rows[i];
    let f = {};
    f.name = row.cells[0].innerText;
    f.base = parseInt(row.cells[2].innerText.replace(/,/g, ''));
    f.url = row.cells[0].innerHTML.match(/href="(.*?)"/)[1];
    forage.push(f);
  }
  forage.sort((a, b) => a.base < b.base ? -1 : 1);
  console.log(JSON.stringify(forage));

}
