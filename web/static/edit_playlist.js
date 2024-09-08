function toggleDisabled(channel_id) {
  gridOptions.api.forEachNodeAfterFilter(
    row => {
        if (row.data.ChannelData.channel_id == channel_id){
          row.data.is_disabled = !row.data.is_disabled;
        }
    }
  )
  
  gridOptions.api.refreshCells({ force: true });
  gridOptions.api.onSortChanged();
  gridOptions.api.redrawRows();
}

function initializeMultiSelect(selector, data, name, placeholder, onChangeFunction) {
  new MultiSelect(selector, {
    placeholder: placeholder,
    selectorName: name,
    data: data,
    onChange: onChangeFunction,
    search: false,
    selectAllButton: true,
    listAll: false
  });
}

function updatedGridData() {
  gridOptions.api.forEachNode(node => {
    node.data.is_disabled = !(selectedLanguages.includes(node.data.ChannelData.channelLanguageId) &&
                              selectedCategories.includes(node.data.ChannelData.channelCategoryId));
  });
  gridOptions.api.refreshCells({ force: true });
  gridOptions.api.onSortChanged();
  gridOptions.api.redrawRows();
}

document.addEventListener('DOMContentLoaded', () => {
  const gridOptions = {
    multiSortKey: "ctrl",
    columnDefs: [
      { headerName: "Channel Name", field: "ChannelData.channel_name", rowDrag: true, sortable: false, filter: "agTextColumnFilter"},
      { headerName: "Logo", field: "ChannelData.logoUrl", cellRenderer: logoRenderer, sortable: false, maxWidth: 100  },
      { headerName: "Category", valueGetter: params => categories[params.data.ChannelData.channelCategoryId] || 'Unknown' },
      { headerName: "Language", field: "ChannelData.channelLanguageId", valueGetter: params => languages[params.data.ChannelData.channelLanguageId] || 'Unknown' },
      { headerName: "Quality", field: "ChannelData.isHD", cellRenderer: qualityRenderer, sortable: false, maxWidth: 100 },
      {
        headerName: "Actions",
        cellRenderer: actionRenderer,
        maxWidth: 100 
      }
    ],
    rowData: channelsData,
    getRowClass: params => {
      return params.data.is_disabled ? 'disabled-row' : '';
    },
    defaultColDef: {
      flex: 1,
      minWidth: 150,
      resizable: true,
    },
    rowDragManaged: true,
    postSortRows: params => {
      let rowNodes = params.nodes;
      let nextInsertPos = 0;
      for (let i = 0; i < rowNodes.length; i++) {
        if (!rowNodes[i].data.is_disabled) {
          rowNodes.splice(nextInsertPos, 0, rowNodes.splice(i, 1)[0]);
          nextInsertPos++;
        }
      }
    },
  };

  function logoRenderer(params){
    return params.value ? `<img src="/jtvimage/${params.value}" alt="Channel Logo" style="height: 50px; width: 50px;">` : ''
  }

  function qualityRenderer(params){
    return params.value ? '<span class="badge badge-primary">HD</span>' : '<span class="badge badge-outline badge-primary">SD</span>'
  }

  function actionRenderer(params){
    const isDisabled = params.data.is_disabled;
    const buttonClass = isDisabled ? 'toggle-disable enabled' : 'toggle-disable disabled';
    const title = isDisabled ? 'Enable Channel' : 'Disable Channel';
    const iconPath = isDisabled ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
    return `<button type="button" class="${buttonClass}" title="${title}" aria-label="${title}" onclick="toggleDisabled(${params.data.ChannelData.channel_id})">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4">
          ${iconPath}
        </svg>
      </button>`;
  }

  window.gridOptions = gridOptions;
  new agGrid.Grid(document.getElementById('myGrid'), gridOptions);

  function handlerCategoryChange(multiselect, value, text, selected) {
    selectedCategories = multiselect.selectedValues.map(x => parseInt(x, 10));
    updatedGridData();
  }

  function handlerLanguageChange(multiselect, value, text, selected) {
    selectedLanguages = multiselect.selectedValues.map(x => parseInt(x, 10));
    updatedGridData();
  }

  const category_list = Object.keys(categories)
    .filter(key => key > 0)
    .map(key => ({ value: key, text: categories[key], selected: pre_selected_ctgy.indexOf(key) >= 0 }));

  const language_list = Object.keys(languages)
    .filter(key => key > 0)
    .map(key => ({ value: key, text: languages[key], selected: pre_selected_langs.indexOf(key) >= 0 }));

  initializeMultiSelect('#selectCategory', category_list, 'category', "Select Category", handlerCategoryChange);
  initializeMultiSelect('#selectLanguages', language_list, 'language', "Select Language", handlerLanguageChange);

  document.getElementById('portexe-search-button').addEventListener('click', saveCustomizations);

  function saveCustomizations() {
    const data = {};
    let channel_no = 1;
    gridOptions.api.setFilterModel(null);
    gridOptions.api.forEachNodeAfterFilterAndSort(node => {
      data[node.data.ChannelData.channel_id] = {
        'channel_no': channel_no.toString(),
        'is_disabled': node.data.is_disabled
      };
      channel_no++;
    });
 
    fetch("/playlist/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(() => location.reload());
  };
});